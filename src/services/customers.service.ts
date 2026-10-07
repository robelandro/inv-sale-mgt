import { db } from "@/db";
import { customers, sales, payments, paymentAllocations } from "@/db/schema";
import { eq, and, or, like, desc, asc, sql, count } from "drizzle-orm";
import { writeAuditLog } from "./audit.service";

export async function getCustomers(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const offset = (page - 1) * pageSize;

  const conditions = [eq(customers.isActive, true)];

  if (params.search && params.search.trim() !== "") {
    const q = `%${params.search.trim()}%`;
    conditions.push(
      or(
        like(customers.name, q),
        like(customers.phone, q),
        like(customers.email, q)
      )!
    );
  }

  const whereClause = and(...conditions);

  const countRes = await db
    .select({ count: count() })
    .from(customers)
    .where(whereClause);
  const total = Number(countRes[0]?.count || 0);

  // Subquery to calculate outstanding balance for each customer
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      address: customers.address,
      notes: customers.notes,
      creditLimit: customers.creditLimit,
      isWalkIn: customers.isWalkIn,
      createdAt: customers.createdAt,
      totalOwed: sql<string>`COALESCE(
        (SELECT SUM(s.balance_due)
         FROM sales s
         WHERE s.customer_id = ${customers.id}
           AND s.status != 'voided'
           AND s.payment_status != 'paid'
        ), 0.00)::numeric(14,2)`,
    })
    .from(customers)
    .where(whereClause)
    .orderBy(asc(customers.name))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getCustomerById(id: string) {
  const row = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      address: customers.address,
      notes: customers.notes,
      creditLimit: customers.creditLimit,
      isWalkIn: customers.isWalkIn,
      isActive: customers.isActive,
      createdAt: customers.createdAt,
      totalOwed: sql<string>`COALESCE(
        (SELECT SUM(s.balance_due)
         FROM sales s
         WHERE s.customer_id = ${customers.id}
           AND s.status != 'voided'
           AND s.payment_status != 'paid'
        ), 0.00)::numeric(14,2)`,
    })
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  return row[0] || null;
}

export async function getCustomerBalance(customerId: string) {
  const cust = await getCustomerById(customerId);
  return {
    customerId,
    totalOwed: cust?.totalOwed || "0.00",
    creditLimit: cust?.creditLimit || null,
  };
}

export async function createCustomer(
  data: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
    creditLimit?: number | null;
  },
  userId: string,
  ip?: string
) {
  const [newCust] = await db
    .insert(customers)
    .values({
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      email: data.email?.trim().toLowerCase() || null,
      address: data.address?.trim() || null,
      notes: data.notes?.trim() || null,
      creditLimit: data.creditLimit !== undefined && data.creditLimit !== null ? data.creditLimit.toFixed(2) : null,
      isWalkIn: false,
      isActive: true,
    })
    .returning();

  await writeAuditLog({
    userId,
    action: "customer.created",
    entityType: "customer",
    entityId: newCust.id,
    details: { name: newCust.name, phone: newCust.phone },
    ip,
  });

  return getCustomerById(newCust.id);
}

export async function updateCustomer(
  id: string,
  data: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
    creditLimit?: number | null;
  },
  userId: string,
  ip?: string
) {
  const current = await db.query.customers.findFirst({
    where: eq(customers.id, id),
  });
  if (!current) throw new Error("Customer not found");

  if (current.isWalkIn && data.name !== current.name) {
    throw new Error("Cannot rename the default Walk-in Customer record.");
  }

  const [updated] = await db
    .update(customers)
    .set({
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      email: data.email?.trim().toLowerCase() || null,
      address: data.address?.trim() || null,
      notes: data.notes?.trim() || null,
      creditLimit: data.creditLimit !== undefined && data.creditLimit !== null ? data.creditLimit.toFixed(2) : null,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, id))
    .returning();

  await writeAuditLog({
    userId,
    action: "customer.updated",
    entityType: "customer",
    entityId: id,
    details: { name: updated.name },
    ip,
  });

  return getCustomerById(id);
}

export async function getCustomerStatement(customerId: string) {
  const cust = await getCustomerById(customerId);
  if (!cust) throw new Error("Customer not found");

  // Fetch sales
  const salesList = await db.query.sales.findMany({
    where: and(eq(sales.customerId, customerId), eq(sales.status, "completed")),
    orderBy: [asc(sales.createdAt)],
  });

  // Fetch payments (excluding reversed)
  const paymentsList = await db.query.payments.findMany({
    where: and(eq(payments.customerId, customerId), sql`${payments.reversedAt} IS NULL`),
    orderBy: [asc(payments.paidAt)],
  });

  // Combine into chronological transactions
  type StatementEntry = {
    id: string;
    date: Date;
    type: "sale" | "payment";
    reference: string;
    description: string;
    debit: string; // charge / sale amount
    credit: string; // payment amount
    runningBalance: string;
  };

  const entries: StatementEntry[] = [];
  let balance = 0; // in cents

  const allEvents = [
    ...salesList.map((s) => ({
      id: s.id,
      date: s.createdAt,
      type: "sale" as const,
      reference: s.invoiceNo,
      description: `Sale Invoice (${s.paymentStatus})`,
      amount: Math.round(Number(s.total) * 100),
    })),
    ...paymentsList.map((p) => ({
      id: p.id,
      date: p.paidAt,
      type: "payment" as const,
      reference: `PMT-${p.id.slice(0, 8)}`,
      description: `Payment (${p.method})${p.note ? ": " + p.note : ""}`,
      amount: Math.round(Number(p.amount) * 100),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const event of allEvents) {
    if (event.type === "sale") {
      balance += event.amount;
      entries.push({
        id: event.id,
        date: event.date,
        type: "sale",
        reference: event.reference,
        description: event.description,
        debit: (event.amount / 100).toFixed(2),
        credit: "0.00",
        runningBalance: (balance / 100).toFixed(2),
      });
    } else {
      balance -= event.amount;
      entries.push({
        id: event.id,
        date: event.date,
        type: "payment",
        reference: event.reference,
        description: event.description,
        debit: "0.00",
        credit: (event.amount / 100).toFixed(2),
        runningBalance: (balance / 100).toFixed(2),
      });
    }
  }

  return {
    customer: cust,
    currentBalance: cust.totalOwed,
    entries,
  };
}
