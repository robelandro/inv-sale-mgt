import { db } from "@/db";
import {
  payments,
  paymentAllocations,
  sales,
  customers,
  users,
} from "@/db/schema";
import { eq, and, desc, asc, sql, count, like, isNull } from "drizzle-orm";
import { toCents, fromCents } from "@/lib/money";
import { writeAuditLog } from "./audit.service";

export interface RecordPaymentInput {
  customerId: string;
  saleId?: string | null;
  amount: number;
  method: "cash" | "card" | "bank_transfer" | "mobile_money" | "other";
  paidAt?: string | null;
  note?: string | null;
  userId: string;
  ip?: string;
}

export async function recordPayment(input: RecordPaymentInput) {
  if (input.amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const pmtAmountCents = toCents(input.amount);

  const result = await db.transaction(async (tx) => {
    // 1. Verify customer exists
    const custRows = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);
    const customer = custRows[0];
    if (!customer) throw new Error("Customer not found.");

    // 2. Fetch unpaid completed sales for this customer, ordered oldest first (FIFO)
    let unpaidSalesQuery;
    if (input.saleId) {
      unpaidSalesQuery = await tx
        .select()
        .from(sales)
        .where(
          and(
            eq(sales.id, input.saleId),
            eq(sales.customerId, input.customerId),
            eq(sales.status, "completed")
          )
        );
    } else {
      unpaidSalesQuery = await tx
        .select()
        .from(sales)
        .where(
          and(
            eq(sales.customerId, input.customerId),
            eq(sales.status, "completed"),
            sql`balance_due > 0`
          )
        )
        .orderBy(asc(sales.createdAt));
    }

    if (unpaidSalesQuery.length === 0) {
      throw new Error("Customer has no outstanding unpaid sales.");
    }

    // Calculate total debt across eligible sales
    const totalDebtCents = unpaidSalesQuery.reduce(
      (sum, s) => sum + toCents(s.balanceDue),
      0
    );

    // Rule: Payment cannot exceed the amount currently owed
    if (pmtAmountCents > totalDebtCents) {
      throw new Error(
        `Payment amount (${fromCents(
          pmtAmountCents
        )}) exceeds the total outstanding balance (${fromCents(totalDebtCents)}).`
      );
    }

    // 3. Insert the payment row
    const [pmt] = await tx
      .insert(payments)
      .values({
        customerId: input.customerId,
        method: input.method,
        amount: fromCents(pmtAmountCents),
        paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
        note: input.note?.trim() || null,
        createdBy: input.userId,
      })
      .returning();

    // 4. Allocate payment amount to sales (FIFO or single sale)
    let remainingToAllocateCents = pmtAmountCents;
    const allocationsDone = [];

    for (const sale of unpaidSalesQuery) {
      if (remainingToAllocateCents <= 0) break;

      const currentBalanceDueCents = toCents(sale.balanceDue);
      const allocationAmountCents = Math.min(
        remainingToAllocateCents,
        currentBalanceDueCents
      );

      // Create allocation row
      const [alloc] = await tx
        .insert(paymentAllocations)
        .values({
          paymentId: pmt.id,
          saleId: sale.id,
          amount: fromCents(allocationAmountCents),
        })
        .returning();

      allocationsDone.push(alloc);

      // Update sale's amount_paid and balance_due
      const newAmountPaidCents = toCents(sale.amountPaid) + allocationAmountCents;
      const newBalanceDueCents = currentBalanceDueCents - allocationAmountCents;
      const newPaymentStatus =
        newBalanceDueCents === 0 ? "paid" : "partial";

      await tx
        .update(sales)
        .set({
          amountPaid: fromCents(newAmountPaidCents),
          balanceDue: fromCents(newBalanceDueCents),
          paymentStatus: newPaymentStatus,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, sale.id));

      remainingToAllocateCents -= allocationAmountCents;
    }

    return { payment: pmt, allocations: allocationsDone };
  });

  await writeAuditLog({
    userId: input.userId,
    action: "payment.recorded",
    entityType: "payment",
    entityId: result.payment.id,
    details: {
      customerId: input.customerId,
      amount: result.payment.amount,
      method: result.payment.method,
      allocationCount: result.allocations.length,
    },
    ip: input.ip,
  });

  return result;
}

export async function reversePayment(params: {
  paymentId: string;
  reason: string;
  userId: string;
  ip?: string;
}) {
  if (!params.reason || params.reason.trim() === "") {
    throw new Error("A reason is mandatory to reverse a payment.");
  }

  const result = await db.transaction(async (tx) => {
    // 1. Fetch payment
    const pmtRows = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, params.paymentId))
      .limit(1);
    const pmt = pmtRows[0];
    if (!pmt) throw new Error("Payment not found.");
    if (pmt.reversedAt) throw new Error("Payment is already reversed.");

    // 2. Fetch allocations
    const allocs = await tx
      .select()
      .from(paymentAllocations)
      .where(eq(paymentAllocations.paymentId, pmt.id));

    // 3. For each allocation, restore the sale balance_due
    for (const alloc of allocs) {
      const saleRows = await tx
        .select()
        .from(sales)
        .where(eq(sales.id, alloc.saleId))
        .limit(1);
      const sale = saleRows[0];
      if (sale && sale.status !== "voided") {
        const allocCents = toCents(alloc.amount);
        const currentAmountPaidCents = toCents(sale.amountPaid);
        const currentBalanceDueCents = toCents(sale.balanceDue);

        const newAmountPaidCents = Math.max(0, currentAmountPaidCents - allocCents);
        const newBalanceDueCents = currentBalanceDueCents + allocCents;

        let newStatus: "paid" | "partial" | "unpaid" = "unpaid";
        if (newBalanceDueCents === 0) {
          newStatus = "paid";
        } else if (newAmountPaidCents > 0) {
          newStatus = "partial";
        }

        await tx
          .update(sales)
          .set({
            amountPaid: fromCents(newAmountPaidCents),
            balanceDue: fromCents(newBalanceDueCents),
            paymentStatus: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(sales.id, sale.id));
      }
    }

    // 4. Mark payment as reversed
    const [updatedPmt] = await tx
      .update(payments)
      .set({
        reversedAt: new Date(),
        reversedBy: params.userId,
        reverseReason: params.reason.trim(),
      })
      .where(eq(payments.id, pmt.id))
      .returning();

    return updatedPmt;
  });

  await writeAuditLog({
    userId: params.userId,
    action: "payment.reversed",
    entityType: "payment",
    entityId: params.paymentId,
    details: {
      amount: result.amount,
      reason: params.reason,
    },
    ip: params.ip,
  });

  return result;
}

export async function getDebts(params: {
  search?: string;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const offset = (page - 1) * pageSize;

  const now = new Date();

  // Query customers with active debts
  let baseQuery = sql`
    SELECT 
      c.id as customer_id,
      c.name as customer_name,
      c.phone as customer_phone,
      c.email as customer_email,
      c.credit_limit,
      SUM(s.balance_due)::numeric(14,2) as total_owed,
      MIN(s.created_at) as oldest_unpaid_date,
      MIN(s.due_date) as earliest_due_date,
      BOOL_OR(s.due_date IS NOT NULL AND s.due_date < ${now.toISOString()} AND s.balance_due > 0) as is_overdue,
      COUNT(s.id)::int as unpaid_sales_count
    FROM customers c
    JOIN sales s ON s.customer_id = c.id
    WHERE s.status != 'voided' AND s.balance_due > 0
  `;

  if (params.search && params.search.trim() !== "") {
    const q = `%${params.search.trim()}%`;
    baseQuery = sql`${baseQuery} AND (c.name ILIKE ${q} OR c.phone ILIKE ${q} OR c.email ILIKE ${q})`;
  }

  baseQuery = sql`${baseQuery} GROUP BY c.id, c.name, c.phone, c.email, c.credit_limit`;

  if (params.overdueOnly) {
    baseQuery = sql`${baseQuery} HAVING BOOL_OR(s.due_date IS NOT NULL AND s.due_date < ${now.toISOString()} AND s.balance_due > 0) = TRUE`;
  }

  // Count total matching
  const countSql = sql`SELECT COUNT(*) as count FROM (${baseQuery}) sub`;
  const countRes = await db.execute(countSql);
  const total = Number(countRes[0]?.count || 0);

  // Paginated query
  const queryWithPagination = sql`
    ${baseQuery}
    ORDER BY total_owed DESC, oldest_unpaid_date ASC
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  const rows = await db.execute(queryWithPagination);

  return {
    items: rows.map((r: any) => ({
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      customerEmail: r.customer_email,
      creditLimit: r.credit_limit,
      totalOwed: r.total_owed,
      oldestUnpaidDate: r.oldest_unpaid_date,
      earliestDueDate: r.earliest_due_date,
      isOverdue: Boolean(r.is_overdue),
      unpaidSalesCount: Number(r.unpaid_sales_count),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getPayments(params: {
  customerId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (params.customerId) {
    conditions.push(eq(payments.customerId, params.customerId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countRes = await db
    .select({ count: count() })
    .from(payments)
    .where(whereClause);
  const total = Number(countRes[0]?.count || 0);

  const rows = await db
    .select({
      id: payments.id,
      customerId: payments.customerId,
      customerName: customers.name,
      amount: payments.amount,
      method: payments.method,
      paidAt: payments.paidAt,
      note: payments.note,
      reversedAt: payments.reversedAt,
      reverseReason: payments.reverseReason,
      creatorName: users.name,
    })
    .from(payments)
    .innerJoin(customers, eq(payments.customerId, customers.id))
    .leftJoin(users, eq(payments.createdBy, users.id))
    .where(whereClause)
    .orderBy(desc(payments.paidAt))
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
