import { db, client } from "@/db";
import {
  sales,
  saleItems,
  stockMovements,
  products,
  customers,
  company,
  payments,
  paymentAllocations,
  users,
} from "@/db/schema";
import { eq, desc, and, or, sql, count, like } from "drizzle-orm";
import { toCents, fromCents, subtractMoney } from "@/lib/money";
import { writeAuditLog } from "./audit.service";

export interface CreateSaleItemInput {
  productId: string;
  qty: number;
  unitPrice?: number;
  discount?: number;
}

export interface CreateSaleInput {
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  items: CreateSaleItemInput[];
  discountTotal?: number;
  amountPaid?: number;
  paymentMethod?: "cash" | "card" | "bank_transfer" | "mobile_money" | "other";
  dueDate?: string | null;
  notes?: string | null;
  userId: string;
  ip?: string;
}

export async function createSale(input: CreateSaleInput) {
  if (!input.items || input.items.length === 0) {
    throw new Error("Cannot create sale with no items.");
  }

  // Execute in ONE atomic database transaction
  const result = await db.transaction(async (tx) => {
    // 1. Fetch Company Settings
    const compRows = await tx.select().from(company).limit(1);
    const comp = compRows[0];
    const allowNegativeStock = comp?.allowNegativeStock ?? false;
    const allowCredit = comp?.allowCredit ?? true;
    const taxEnabled = comp?.taxEnabled ?? false;
    const taxRate = comp ? Number(comp.taxRate) : 0;
    const invoicePrefix = comp?.invoicePrefix || "INV";

    // 2. Fetch Customer if specified
    let customer: any = null;
    if (input.customerId) {
      const custRows = await tx.select().from(customers).where(eq(customers.id, input.customerId)).limit(1);
      customer = custRows[0] || null;
      if (customer && !customer.isActive) {
        throw new Error("Cannot make a sale to an inactive customer.");
      }
    }

    // 3. Lock products FOR UPDATE to prevent race conditions & overselling
    // Sort product IDs first to avoid deadlocks
    const sortedProductIds = [...new Set(input.items.map((i) => i.productId))].sort();
    const lockedProductsMap = new Map<string, any>();

    for (const pId of sortedProductIds) {
      const locked = await tx.execute(
        sql`SELECT id, name, sku, stock_qty, cost_price, selling_price, is_active FROM products WHERE id = ${pId} FOR UPDATE`
      );
      if (!locked[0]) {
        throw new Error(`Product not found: ${pId}`);
      }
      lockedProductsMap.set(pId, locked[0]);
    }

    // 4. Calculate items, totals and verify stock
    let subtotalCents = 0;
    let lineDiscountsCents = 0;
    const processedItems: {
      productId: string;
      productName: string;
      sku: string;
      qty: number;
      unitPriceCents: number;
      unitCostCents: number;
      discountCents: number;
      lineTotalCents: number;
      newStockQty: number;
    }[] = [];

    // Aggregate quantities requested per product (in case same product added twice)
    const productQtyNeeded = new Map<string, number>();
    for (const item of input.items) {
      if (item.qty <= 0) {
        throw new Error("Quantity must be greater than zero for all items.");
      }
      productQtyNeeded.set(
        item.productId,
        (productQtyNeeded.get(item.productId) || 0) + item.qty
      );
    }

    // Verify stock availability
    for (const [pId, needed] of productQtyNeeded.entries()) {
      const prod = lockedProductsMap.get(pId);
      if (!prod.is_active) {
        throw new Error(`Product "${prod.name}" is archived and cannot be sold.`);
      }
      const currentStock = Number(prod.stock_qty);
      if (!allowNegativeStock && currentStock < needed) {
        throw new Error(
          `Insufficient stock for "${prod.name}". Available: ${currentStock}, requested: ${needed}.`
        );
      }
    }

    // Process line items
    for (const item of input.items) {
      const prod = lockedProductsMap.get(item.productId);
      const unitPriceCents =
        item.unitPrice !== undefined
          ? toCents(item.unitPrice)
          : toCents(prod.selling_price);

      const unitCostCents = toCents(prod.cost_price);
      const discountCents = item.discount ? toCents(item.discount) : 0;

      const itemTotalCents = Math.round(item.qty * unitPriceCents) - discountCents;
      if (itemTotalCents < 0) {
        throw new Error(`Line total cannot be negative for product "${prod.name}".`);
      }

      subtotalCents += Math.round(item.qty * unitPriceCents);
      lineDiscountsCents += discountCents;

      const currentStock = Number(prod.stock_qty);
      const newStock = currentStock - item.qty;

      processedItems.push({
        productId: item.productId,
        productName: prod.name,
        sku: prod.sku,
        qty: item.qty,
        unitPriceCents,
        unitCostCents,
        discountCents,
        lineTotalCents: itemTotalCents,
        newStockQty: newStock,
      });
    }

    // 5. Compute server totals
    const wholeSaleDiscountCents = input.discountTotal ? toCents(input.discountTotal) : 0;
    const totalDiscountCents = lineDiscountsCents + wholeSaleDiscountCents;
    const taxableAmountCents = Math.max(0, subtotalCents - totalDiscountCents);

    let taxTotalCents = 0;
    if (taxEnabled && taxRate > 0) {
      taxTotalCents = Math.round((taxableAmountCents * taxRate) / 100);
    }

    const grandTotalCents = taxableAmountCents + taxTotalCents;
    const amountPaidCents = input.amountPaid !== undefined ? toCents(input.amountPaid) : grandTotalCents;

    // Rule 8: amount_paid can never exceed total on a sale (no overpayment in v1)
    if (amountPaidCents > grandTotalCents) {
      throw new Error(
        `Amount paid (${fromCents(amountPaidCents)}) cannot exceed total invoice amount (${fromCents(grandTotalCents)}).`
      );
    }

    const balanceDueCents = grandTotalCents - amountPaidCents;

    // Determine payment status
    let paymentStatus: "paid" | "partial" | "unpaid" = "paid";
    if (balanceDueCents === 0) {
      paymentStatus = "paid";
    } else if (amountPaidCents > 0 && balanceDueCents > 0) {
      paymentStatus = "partial";
    } else {
      paymentStatus = "unpaid";
    }

    // Resolve Customer:
    // If a new or explicit customer name was provided, link to existing or auto-create customer
    if (input.customerName && input.customerName.trim().length > 0) {
      const cleanName = input.customerName.trim();
      const cleanPhone = input.customerPhone?.trim() || null;
      let existingCust: any = null;

      if (cleanPhone) {
        const found = await tx.select().from(customers).where(eq(customers.phone, cleanPhone)).limit(1);
        if (found[0]) existingCust = found[0];
      }
      if (!existingCust) {
        const found = await tx.select().from(customers).where(eq(customers.name, cleanName)).limit(1);
        if (found[0] && !found[0].isWalkIn) existingCust = found[0];
      }

      if (existingCust) {
        customer = existingCust;
      } else {
        const [newCust] = await tx.insert(customers).values({
          name: cleanName,
          phone: cleanPhone,
          isWalkIn: false,
          isActive: true,
        }).returning();
        customer = newCust;
      }
    }

    // Default to Walk-In Customer if no customer specified or resolved
    if (!customer) {
      const walkInRows = await tx.select().from(customers).where(eq(customers.isWalkIn, true)).limit(1);
      customer = walkInRows[0];
      if (!customer) {
        const [w] = await tx.insert(customers).values({
          name: "Walk-in Customer",
          isWalkIn: true,
          isActive: true,
        }).returning();
        customer = w;
      }
    }

    // Rule 7: If balance_due > 0: customer must not be Walk-in, credit sales must be enabled, credit limit check
    if (balanceDueCents > 0) {
      if (customer.isWalkIn) {
        throw new Error(
          "Customer name is required for credit or partial debt sales. Please provide customer name."
        );
      }
      if (!allowCredit) {
        throw new Error("Credit sales are disabled in company settings.");
      }

      // Check credit limit if specified
      if (customer.creditLimit !== null && customer.creditLimit !== undefined) {
        const creditLimitCents = toCents(customer.creditLimit);
        // Calculate current outstanding customer balance
        const balanceQuery = await tx.execute(
          sql`SELECT COALESCE(SUM(balance_due), 0.00) as current_owed
              FROM sales
              WHERE customer_id = ${customer.id}
                AND status != 'voided'
                AND payment_status != 'paid'`
        );
        const currentOwedCents = toCents(
          ((balanceQuery[0] as any)?.current_owed as string | number) || "0.00"
        );
        if (currentOwedCents + balanceDueCents > creditLimitCents) {
          throw new Error(
            `Sale exceeds customer credit limit. Current owed: ${fromCents(
              currentOwedCents
            )}, New debt: ${fromCents(balanceDueCents)}, Credit limit: ${fromCents(
              creditLimitCents
            )}.`
          );
        }
      }
    }

    // 6. Generate sequential gap-free invoice number from DB sequence inside transaction
    const seqResult = await tx.execute(sql`SELECT nextval('invoice_no_seq') as seq`);
    const seqNum = Number(seqResult[0]?.seq || 1);
    const invoiceNo = `${invoicePrefix}-${seqNum.toString().padStart(6, "0")}`;

    // 7. Insert the sale record
    const [newSale] = await tx
      .insert(sales)
      .values({
        invoiceNo,
        customerId: customer.id,
        status: "completed",
        subtotal: fromCents(subtotalCents),
        discountTotal: fromCents(totalDiscountCents),
        taxTotal: fromCents(taxTotalCents),
        total: fromCents(grandTotalCents),
        amountPaid: fromCents(amountPaidCents),
        balanceDue: fromCents(balanceDueCents),
        paymentStatus,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        notes: input.notes?.trim() || null,
        createdBy: input.userId,
      })
      .returning();

    // 8. Insert sale items, stock movements, and update product quantities
    for (const item of processedItems) {
      // Insert item snapshot
      await tx.insert(saleItems).values({
        saleId: newSale.id,
        productId: item.productId,
        productNameSnapshot: item.productName,
        skuSnapshot: item.sku,
        qty: item.qty.toFixed(3),
        unitPrice: fromCents(item.unitPriceCents),
        unitCost: fromCents(item.unitCostCents),
        discount: fromCents(item.discountCents),
        lineTotal: fromCents(item.lineTotalCents),
      });

      // Update product stock_qty
      await tx
        .update(products)
        .set({
          stockQty: item.newStockQty.toFixed(3),
          updatedAt: new Date(),
        })
        .where(eq(products.id, item.productId));

      // Insert stock movement
      await tx.insert(stockMovements).values({
        productId: item.productId,
        type: "sale",
        qtyChange: (-item.qty).toFixed(3),
        qtyAfter: item.newStockQty.toFixed(3),
        unitCost: fromCents(item.unitCostCents),
        referenceType: "sale",
        referenceId: newSale.id,
        reason: `Sold on invoice ${invoiceNo}`,
        createdBy: input.userId,
      });
    }

    // 9. If amount_paid > 0, insert payment and allocation
    let paymentRecord = null;
    if (amountPaidCents > 0) {
      const [pmt] = await tx
        .insert(payments)
        .values({
          customerId: customer.id,
          method: input.paymentMethod || "cash",
          amount: fromCents(amountPaidCents),
          paidAt: new Date(),
          note: `Payment for invoice ${invoiceNo}`,
          createdBy: input.userId,
        })
        .returning();

      await tx.insert(paymentAllocations).values({
        paymentId: pmt.id,
        saleId: newSale.id,
        amount: fromCents(amountPaidCents),
      });

      paymentRecord = pmt;
    }

    return {
      sale: newSale,
      payment: paymentRecord,
    };
  });

  await writeAuditLog({
    userId: input.userId,
    action: "sale.created",
    entityType: "sale",
    entityId: result.sale.id,
    details: {
      invoiceNo: result.sale.invoiceNo,
      total: result.sale.total,
      amountPaid: result.sale.amountPaid,
      balanceDue: result.sale.balanceDue,
      paymentStatus: result.sale.paymentStatus,
    },
    ip: input.ip,
  });

  return getSaleById(result.sale.id);
}

export async function getSaleById(id: string) {
  const saleRow = await db
    .select({
      id: sales.id,
      invoiceNo: sales.invoiceNo,
      customerId: sales.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerEmail: customers.email,
      customerAddress: customers.address,
      status: sales.status,
      subtotal: sales.subtotal,
      discountTotal: sales.discountTotal,
      taxTotal: sales.taxTotal,
      total: sales.total,
      amountPaid: sales.amountPaid,
      balanceDue: sales.balanceDue,
      paymentStatus: sales.paymentStatus,
      dueDate: sales.dueDate,
      notes: sales.notes,
      createdAt: sales.createdAt,
      voidedAt: sales.voidedAt,
      voidReason: sales.voidReason,
      creatorName: users.name,
    })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(users, eq(sales.createdBy, users.id))
    .where(eq(sales.id, id))
    .limit(1);

  if (!saleRow[0]) return null;

  const items = await db
    .select({
      id: saleItems.id,
      productId: saleItems.productId,
      productName: saleItems.productNameSnapshot,
      sku: saleItems.skuSnapshot,
      qty: saleItems.qty,
      unitPrice: saleItems.unitPrice,
      unitCost: saleItems.unitCost,
      discount: saleItems.discount,
      lineTotal: saleItems.lineTotal,
    })
    .from(saleItems)
    .where(eq(saleItems.saleId, id));

  const allocations = await db
    .select({
      id: paymentAllocations.id,
      paymentId: paymentAllocations.paymentId,
      amount: paymentAllocations.amount,
      paidAt: payments.paidAt,
      method: payments.method,
      reversedAt: payments.reversedAt,
    })
    .from(paymentAllocations)
    .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id))
    .where(eq(paymentAllocations.saleId, id));

  return {
    ...saleRow[0],
    items,
    allocations,
  };
}

export async function getSales(params: {
  search?: string;
  customerId?: string;
  status?: "completed" | "voided" | "all";
  paymentStatus?: "paid" | "partial" | "unpaid" | "all";
  fromDate?: Date | string;
  toDate?: Date | string;
  userIdOnly?: string; // For Cashier (own only)
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (params.status && params.status !== "all") {
    conditions.push(eq(sales.status, params.status));
  }

  if (params.paymentStatus && params.paymentStatus !== "all") {
    conditions.push(eq(sales.paymentStatus, params.paymentStatus));
  }

  if (params.customerId) {
    conditions.push(eq(sales.customerId, params.customerId));
  }

  if (params.userIdOnly) {
    conditions.push(eq(sales.createdBy, params.userIdOnly));
  }

  if (params.fromDate) {
    conditions.push(sql`${sales.createdAt} >= ${new Date(params.fromDate).toISOString()}`);
  }

  if (params.toDate) {
    const end = new Date(params.toDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(sql`${sales.createdAt} <= ${end.toISOString()}`);
  }

  if (params.search && params.search.trim() !== "") {
    const q = `%${params.search.trim()}%`;
    conditions.push(
      or(
        like(sales.invoiceNo, q),
        like(customers.name, q)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countRes = await db
    .select({ count: count() })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .where(whereClause);
  const total = Number(countRes[0]?.count || 0);

  const rows = await db
    .select({
      id: sales.id,
      invoiceNo: sales.invoiceNo,
      customerId: sales.customerId,
      customerName: customers.name,
      status: sales.status,
      total: sales.total,
      amountPaid: sales.amountPaid,
      balanceDue: sales.balanceDue,
      paymentStatus: sales.paymentStatus,
      dueDate: sales.dueDate,
      createdAt: sales.createdAt,
      creatorName: users.name,
    })
    .from(sales)
    .innerJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(users, eq(sales.createdBy, users.id))
    .where(whereClause)
    .orderBy(desc(sales.createdAt))
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

export async function voidSale(params: {
  saleId: string;
  reason: string;
  userId: string;
  ip?: string;
}) {
  if (!params.reason || params.reason.trim() === "") {
    throw new Error("A reason is mandatory to void a sale.");
  }

  const result = await db.transaction(async (tx) => {
    // 1. Fetch and lock sale
    const saleList = await tx
      .select()
      .from(sales)
      .where(eq(sales.id, params.saleId))
      .limit(1);
    const sale = saleList[0];
    if (!sale) throw new Error("Sale not found.");
    if (sale.status === "voided") {
      throw new Error("This sale is already voided.");
    }

    // 2. Fetch sale items to restore stock
    const items = await tx
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, params.saleId));

    for (const item of items) {
      // Lock product
      const pRows = await tx.execute(
        sql`SELECT id, name, stock_qty FROM products WHERE id = ${item.productId} FOR UPDATE`
      );
      const prod = pRows[0] as any;
      if (prod) {
        const restoredQty = Number(prod.stock_qty) + Number(item.qty);
        // Update product stock
        await tx
          .update(products)
          .set({
            stockQty: restoredQty.toFixed(3),
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId));

        // Insert stock movement
        await tx.insert(stockMovements).values({
          productId: item.productId,
          type: "sale_void",
          qtyChange: Number(item.qty).toFixed(3),
          qtyAfter: restoredQty.toFixed(3),
          unitCost: item.unitCost,
          referenceType: "sale",
          referenceId: sale.id,
          reason: `Restored stock from voided invoice ${sale.invoiceNo}: ${params.reason.trim()}`,
          createdBy: params.userId,
        });
      }
    }

    // 3. Mark sale as voided
    await tx
      .update(sales)
      .set({
        status: "voided",
        voidedAt: new Date(),
        voidedBy: params.userId,
        voidReason: params.reason.trim(),
        balanceDue: "0.00", // debt is removed
        updatedAt: new Date(),
      })
      .where(eq(sales.id, params.saleId));

    // 4. Mark associated payments as reversed
    const allocs = await tx
      .select()
      .from(paymentAllocations)
      .where(eq(paymentAllocations.saleId, params.saleId));

    for (const alloc of allocs) {
      await tx
        .update(payments)
        .set({
          reversedAt: new Date(),
          reversedBy: params.userId,
          reverseReason: `Associated sale ${sale.invoiceNo} was voided: ${params.reason.trim()}`,
        })
        .where(eq(payments.id, alloc.paymentId));
    }

    return sale;
  });

  await writeAuditLog({
    userId: params.userId,
    action: "sale.voided",
    entityType: "sale",
    entityId: params.saleId,
    details: {
      invoiceNo: result.invoiceNo,
      reason: params.reason,
    },
    ip: params.ip,
  });

  return getSaleById(params.saleId);
}
