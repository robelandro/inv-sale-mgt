import { db } from "@/db";
import { products, stockMovements, company } from "@/db/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { writeAuditLog } from "./audit.service";

export interface StockAdjustmentInput {
  productId: string;
  qtyChange: number; // positive or negative
  reason: string;
  userId: string;
  ip?: string;
}

export interface ReceiveStockItemInput {
  productId: string;
  quantity: number;
  unitCost?: number;
  updateCostPrice?: boolean;
}

export interface ReceiveStockInput {
  items: ReceiveStockItemInput[];
  supplier?: string | null;
  note?: string | null;
  userId: string;
  ip?: string;
}

export async function adjustStock(params: StockAdjustmentInput) {
  if (!params.reason || params.reason.trim() === "") {
    throw new Error("A reason is mandatory for any stock adjustment.");
  }
  if (params.qtyChange === 0) {
    throw new Error("Quantity change cannot be zero.");
  }

  const comp = await db.query.company.findFirst();
  const allowNegative = comp?.allowNegativeStock ?? false;

  const result = await db.transaction(async (tx) => {
    // Lock product row for update
    const productRows = await tx.execute(
      sql`SELECT id, name, sku, stock_qty, cost_price FROM products WHERE id = ${params.productId} FOR UPDATE`
    );
    const prod = productRows[0] as any;
    if (!prod) throw new Error("Product not found");

    const currentQty = Number(prod.stock_qty);
    const newQty = currentQty + params.qtyChange;

    if (!allowNegative && newQty < 0) {
      throw new Error(
        `Insufficient stock for "${prod.name}". Current stock is ${currentQty}, adjustment would result in ${newQty}.`
      );
    }

    const movementType = params.qtyChange > 0 ? "adjustment_in" : "adjustment_out";

    // 1. Insert immutable stock movement
    const [movement] = await tx
      .insert(stockMovements)
      .values({
        productId: params.productId,
        type: movementType,
        qtyChange: params.qtyChange.toFixed(3),
        qtyAfter: newQty.toFixed(3),
        unitCost: prod.cost_price,
        referenceType: "adjustment",
        reason: params.reason.trim(),
        createdBy: params.userId,
      })
      .returning();

    // 2. Update product stock_qty inside the same transaction
    await tx
      .update(products)
      .set({
        stockQty: newQty.toFixed(3),
        updatedAt: new Date(),
      })
      .where(eq(products.id, params.productId));

    return { movement, newQty, productName: prod.name };
  });

  await writeAuditLog({
    userId: params.userId,
    action: "stock.adjusted",
    entityType: "product",
    entityId: params.productId,
    details: {
      product: result.productName,
      qtyChange: params.qtyChange,
      newQty: result.newQty,
      reason: params.reason,
    },
    ip: params.ip,
  });

  return result;
}

export async function receiveStock(params: ReceiveStockInput) {
  if (!params.items || params.items.length === 0) {
    throw new Error("No items provided for stock receiving.");
  }

  const result = await db.transaction(async (tx) => {
    const updatedProducts = [];

    for (const item of params.items) {
      if (item.quantity <= 0) {
        throw new Error("Received quantity must be greater than zero.");
      }

      // Lock row
      const productRows = await tx.execute(
        sql`SELECT id, name, sku, stock_qty, cost_price FROM products WHERE id = ${item.productId} FOR UPDATE`
      );
      const prod = productRows[0] as any;
      if (!prod) throw new Error(`Product ID ${item.productId} not found`);

      const currentQty = Number(prod.stock_qty);
      const newQty = currentQty + item.quantity;
      const unitCost = item.unitCost !== undefined ? item.unitCost : Number(prod.cost_price);

      // 1. Insert movement
      await tx.insert(stockMovements).values({
        productId: item.productId,
        type: "purchase",
        qtyChange: item.quantity.toFixed(3),
        qtyAfter: newQty.toFixed(3),
        unitCost: unitCost.toFixed(2),
        referenceType: "purchase",
        reason: params.note ? `Supplier: ${params.supplier || "N/A"}. ${params.note}` : `Supplier: ${params.supplier || "N/A"}`,
        createdBy: params.userId,
      });

      // 2. Update product stock_qty and optionally cost_price
      const updateData: any = {
        stockQty: newQty.toFixed(3),
        updatedAt: new Date(),
      };
      if (item.updateCostPrice && item.unitCost !== undefined) {
        updateData.costPrice = item.unitCost.toFixed(2);
      }

      await tx
        .update(products)
        .set(updateData)
        .where(eq(products.id, item.productId));

      updatedProducts.push({
        id: item.productId,
        name: prod.name,
        receivedQty: item.quantity,
        newQty,
      });
    }

    return updatedProducts;
  });

  await writeAuditLog({
    userId: params.userId,
    action: "stock.received",
    entityType: "inventory",
    details: {
      itemCount: params.items.length,
      supplier: params.supplier,
      items: result,
    },
    ip: params.ip,
  });

  return result;
}

export async function getStockMovements(params: {
  productId?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (params.productId) {
    conditions.push(eq(stockMovements.productId, params.productId));
  }
  if (params.type) {
    conditions.push(eq(stockMovements.type, params.type));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countRes = await db
    .select({ count: count() })
    .from(stockMovements)
    .where(whereClause);
  const total = Number(countRes[0]?.count || 0);

  const rows = await db
    .select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      productName: products.name,
      productSku: products.sku,
      type: stockMovements.type,
      qtyChange: stockMovements.qtyChange,
      qtyAfter: stockMovements.qtyAfter,
      unitCost: stockMovements.unitCost,
      referenceType: stockMovements.referenceType,
      referenceId: stockMovements.referenceId,
      reason: stockMovements.reason,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .where(whereClause)
    .orderBy(desc(stockMovements.createdAt))
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
