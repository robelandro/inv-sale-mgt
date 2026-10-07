import { db } from "@/db";
import {
  products,
  stockMovements,
  categories,
  units,
  saleItems,
  company,
} from "@/db/schema";
import {
  eq,
  like,
  or,
  and,
  desc,
  asc,
  count,
  sql,
  gt,
  lte,
} from "drizzle-orm";
import { writeAuditLog } from "./audit.service";
import crypto from "crypto";

export interface GetProductsParams {
  search?: string;
  categoryId?: string;
  stockStatus?: "all" | "in_stock" | "low" | "out";
  includeArchived?: boolean;
  canViewCost?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "sku" | "sellingPrice" | "stockQty" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export async function getProducts(params: GetProductsParams = {}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const offset = (page - 1) * pageSize;

  const comp = await db.query.company.findFirst();
  const defaultLowThreshold = comp?.lowStockDefault ?? 5;

  const conditions = [];

  if (!params.includeArchived) {
    conditions.push(eq(products.isActive, true));
  }

  if (params.categoryId) {
    conditions.push(eq(products.categoryId, params.categoryId));
  }

  if (params.search && params.search.trim() !== "") {
    const q = `%${params.search.trim()}%`;
    conditions.push(
      or(
        like(products.name, q),
        like(products.sku, q),
        like(products.barcode, q)
      )
    );
  }

  if (params.stockStatus === "in_stock") {
    // stock > coalesce(low_stock_threshold, defaultLowThreshold)
    conditions.push(
      sql`${products.stockQty} > COALESCE(${products.lowStockThreshold}, ${defaultLowThreshold})`
    );
  } else if (params.stockStatus === "low") {
    // 0 < stock <= coalesce(low_stock_threshold, defaultLowThreshold)
    conditions.push(
      sql`${products.stockQty} > 0 AND ${products.stockQty} <= COALESCE(${products.lowStockThreshold}, ${defaultLowThreshold})`
    );
  } else if (params.stockStatus === "out") {
    // stock <= 0
    conditions.push(sql`${products.stockQty} <= 0`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Total count
  const countRes = await db
    .select({ count: count() })
    .from(products)
    .where(whereClause);
  const total = Number(countRes[0]?.count || 0);

  // Sorting
  const sortCol =
    params.sortBy === "sku"
      ? products.sku
      : params.sortBy === "sellingPrice"
      ? products.sellingPrice
      : params.sortBy === "stockQty"
      ? products.stockQty
      : params.sortBy === "createdAt"
      ? products.createdAt
      : products.name;

  const orderExpr = params.sortOrder === "desc" ? desc(sortCol) : asc(sortCol);

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      barcode: products.barcode,
      categoryId: products.categoryId,
      categoryName: categories.name,
      unitId: products.unitId,
      unitName: units.name,
      unitShortName: units.shortName,
      costPrice: products.costPrice,
      sellingPrice: products.sellingPrice,
      stockQty: products.stockQty,
      lowStockThreshold: products.lowStockThreshold,
      imageUrl: products.imageUrl,
      description: products.description,
      isActive: products.isActive,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(units, eq(products.unitId, units.id))
    .where(whereClause)
    .orderBy(orderExpr)
    .limit(pageSize)
    .offset(offset);

  // Strip cost price if caller lacks permission
  const sanitizedRows = rows.map((r) => {
    const isLow =
      Number(r.stockQty) > 0 &&
      Number(r.stockQty) <= (r.lowStockThreshold ?? defaultLowThreshold);
    const isOut = Number(r.stockQty) <= 0;
    const stockStatus = isOut ? "out" : isLow ? "low" : "in_stock";

    return {
      ...r,
      stockStatus,
      costPrice: params.canViewCost ? r.costPrice : "0.00",
    };
  });

  return {
    items: sanitizedRows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getProductById(id: string, canViewCost = true) {
  const row = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      barcode: products.barcode,
      categoryId: products.categoryId,
      categoryName: categories.name,
      unitId: products.unitId,
      unitName: units.name,
      unitShortName: units.shortName,
      costPrice: products.costPrice,
      sellingPrice: products.sellingPrice,
      stockQty: products.stockQty,
      lowStockThreshold: products.lowStockThreshold,
      imageUrl: products.imageUrl,
      description: products.description,
      isActive: products.isActive,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(units, eq(products.unitId, units.id))
    .where(eq(products.id, id))
    .limit(1);

  if (!row[0]) return null;

  const item = row[0];
  const comp = await db.query.company.findFirst();
  const defaultLowThreshold = comp?.lowStockDefault ?? 5;
  const isLow =
    Number(item.stockQty) > 0 &&
    Number(item.stockQty) <= (item.lowStockThreshold ?? defaultLowThreshold);
  const isOut = Number(item.stockQty) <= 0;

  return {
    ...item,
    stockStatus: isOut ? "out" : isLow ? "low" : "in_stock",
    costPrice: canViewCost ? item.costPrice : "0.00",
  };
}

export async function createProduct(
  data: {
    name: string;
    sku?: string;
    barcode?: string | null;
    categoryId?: string | null;
    newCategoryName?: string | null;
    unitId?: string | null;
    costPrice?: number;
    sellingPrice?: number;
    initialStock?: number;
    lowStockThreshold?: number | null;
    description?: string | null;
    imageUrl?: string | null;
  },
  userId: string,
  ip?: string
) {
  // Handle new category name creation on the fly
  let categoryId = data.categoryId || null;
  if (data.newCategoryName && data.newCategoryName.trim()) {
    const trimmedCat = data.newCategoryName.trim();
    const existingCat = await db.query.categories.findFirst({
      where: sql`LOWER(${categories.name}) = LOWER(${trimmedCat})`,
    });
    if (existingCat) {
      categoryId = existingCat.id;
    } else {
      const [newCat] = await db
        .insert(categories)
        .values({ name: trimmedCat })
        .returning();
      categoryId = newCat.id;
    }
  }

  // Generate SKU if blank
  let sku = data.sku?.trim();
  if (!sku) {
    const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    sku = `SKU-${randomSuffix}`;
  }

  // Check unique SKU
  const existingSku = await db.query.products.findFirst({
    where: eq(products.sku, sku),
  });
  if (existingSku) {
    throw new Error(`SKU "${sku}" already exists`);
  }

  if (data.barcode && data.barcode.trim() !== "") {
    const existingBarcode = await db.query.products.findFirst({
      where: eq(products.barcode, data.barcode.trim()),
    });
    if (existingBarcode) {
      throw new Error(`Barcode "${data.barcode}" already exists`);
    }
  }

  const initialStockQty = Math.max(0, data.initialStock || 0);

  const result = await db.transaction(async (tx) => {
    const [newProduct] = await tx
      .insert(products)
      .values({
        name: data.name.trim(),
        sku,
        barcode: data.barcode?.trim() || null,
        categoryId: categoryId || null,
        unitId: data.unitId || null,
        costPrice: (data.costPrice ?? 0).toFixed(2),
        sellingPrice: (data.sellingPrice ?? 0).toFixed(2),
        stockQty: initialStockQty.toFixed(3),
        lowStockThreshold: data.lowStockThreshold ?? null,
        description: data.description?.trim() || null,
        imageUrl: data.imageUrl || null,
        isActive: true,
      })
      .returning();

    // Opening stock movement if initialStock > 0
    if (initialStockQty > 0) {
      await tx.insert(stockMovements).values({
        productId: newProduct.id,
        type: "opening",
        qtyChange: initialStockQty.toFixed(3),
        qtyAfter: initialStockQty.toFixed(3),
        unitCost: (data.costPrice ?? 0).toFixed(2),
        referenceType: "manual",
        reason: "Initial inventory setup",
        createdBy: userId,
      });
    }

    return newProduct;
  });

  await writeAuditLog({
    userId,
    action: "product.created",
    entityType: "product",
    entityId: result.id,
    details: {
      name: result.name,
      sku: result.sku,
      initialStock: initialStockQty,
      sellingPrice: result.sellingPrice,
      costPrice: result.costPrice,
    },
    ip,
  });

  return getProductById(result.id, true);
}

export async function updateProduct(
  id: string,
  data: {
    name: string;
    sku: string;
    barcode?: string | null;
    categoryId?: string | null;
    unitId?: string | null;
    costPrice?: number;
    sellingPrice?: number;
    lowStockThreshold?: number | null;
    description?: string | null;
    imageUrl?: string | null;
    isActive?: boolean;
  },
  userId: string,
  ip?: string
) {
  const current = await db.query.products.findFirst({
    where: eq(products.id, id),
  });
  if (!current) throw new Error("Product not found");

  // Validate unique SKU if changed
  if (data.sku !== current.sku) {
    const existingSku = await db.query.products.findFirst({
      where: eq(products.sku, data.sku),
    });
    if (existingSku && existingSku.id !== id) {
      throw new Error(`SKU "${data.sku}" is already used by another product`);
    }
  }

  // Validate unique Barcode if changed
  if (data.barcode && data.barcode.trim() !== "" && data.barcode !== current.barcode) {
    const existingBarcode = await db.query.products.findFirst({
      where: eq(products.barcode, data.barcode.trim()),
    });
    if (existingBarcode && existingBarcode.id !== id) {
      throw new Error(`Barcode "${data.barcode}" is already in use`);
    }
  }

  const [updated] = await db
    .update(products)
    .set({
      name: data.name.trim(),
      sku: data.sku.trim(),
      barcode: data.barcode?.trim() || null,
      categoryId: data.categoryId || null,
      unitId: data.unitId || null,
      costPrice: data.costPrice !== undefined ? data.costPrice.toFixed(2) : current.costPrice,
      sellingPrice: data.sellingPrice !== undefined ? data.sellingPrice.toFixed(2) : current.sellingPrice,
      lowStockThreshold: data.lowStockThreshold !== undefined ? data.lowStockThreshold : current.lowStockThreshold,
      description: data.description !== undefined ? data.description : current.description,
      imageUrl: data.imageUrl !== undefined ? data.imageUrl : current.imageUrl,
      isActive: data.isActive !== undefined ? data.isActive : current.isActive,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();

  await writeAuditLog({
    userId,
    action: "product.updated",
    entityType: "product",
    entityId: id,
    details: {
      before: {
        costPrice: current.costPrice,
        sellingPrice: current.sellingPrice,
        isActive: current.isActive,
      },
      after: {
        costPrice: updated.costPrice,
        sellingPrice: updated.sellingPrice,
        isActive: updated.isActive,
      },
    },
    ip,
  });

  return getProductById(id, true);
}

export async function archiveProduct(id: string, userId: string, ip?: string) {
  const current = await db.query.products.findFirst({
    where: eq(products.id, id),
  });
  if (!current) throw new Error("Product not found");

  // Check sales history
  const salesCount = await db
    .select({ count: count() })
    .from(saleItems)
    .where(eq(saleItems.productId, id));

  // If no sales history and no movements, can hard delete or archive
  // But spec says: "A product with any sales history cannot be deleted, only archived."
  if (salesCount[0].count > 0) {
    await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id));

    await writeAuditLog({
      userId,
      action: "product.archived",
      entityType: "product",
      entityId: id,
      details: { reason: "Product has sales history; archived" },
      ip,
    });
    return { archived: true };
  } else {
    // Check if movements exist
    const movementsCount = await db
      .select({ count: count() })
      .from(stockMovements)
      .where(eq(stockMovements.productId, id));

    if (movementsCount[0].count > 0) {
      await db
        .update(products)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(products.id, id));

      await writeAuditLog({
        userId,
        action: "product.archived",
        entityType: "product",
        entityId: id,
        ip,
      });
      return { archived: true };
    } else {
      // Safe to delete if fresh product
      await db.delete(products).where(eq(products.id, id));
      await writeAuditLog({
        userId,
        action: "product.deleted",
        entityType: "product",
        entityId: id,
        ip,
      });
      return { deleted: true };
    }
  }
}
