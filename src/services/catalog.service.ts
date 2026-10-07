import { db } from "@/db";
import { categories, units, products } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { writeAuditLog } from "./audit.service";

export async function getCategories() {
  return db.query.categories.findMany({
    orderBy: (cat, { asc }) => [asc(cat.name)],
  });
}

export async function createCategory(name: string, userId: string, ip?: string) {
  const existing = await db.query.categories.findFirst({
    where: eq(categories.name, name.trim()),
  });
  if (existing) throw new Error("Category with this name already exists");

  const [row] = await db
    .insert(categories)
    .values({ name: name.trim() })
    .returning();

  await writeAuditLog({
    userId,
    action: "category.created",
    entityType: "category",
    entityId: row.id,
    details: { name: row.name },
    ip,
  });

  return row;
}

export async function updateCategory(id: string, name: string, userId: string, ip?: string) {
  const [row] = await db
    .update(categories)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();

  await writeAuditLog({
    userId,
    action: "category.updated",
    entityType: "category",
    entityId: id,
    details: { name: row.name },
    ip,
  });

  return row;
}

export async function deleteCategory(id: string, userId: string, ip?: string) {
  const productsCount = await db
    .select({ count: count() })
    .from(products)
    .where(eq(products.categoryId, id));

  if (productsCount[0].count > 0) {
    throw new Error("Cannot delete category associated with existing products");
  }

  await db.delete(categories).where(eq(categories.id, id));

  await writeAuditLog({
    userId,
    action: "category.deleted",
    entityType: "category",
    entityId: id,
    ip,
  });
}

export async function getUnits() {
  return db.query.units.findMany({
    orderBy: (u, { asc }) => [asc(u.name)],
  });
}

export async function createUnit(name: string, shortName: string, userId: string, ip?: string) {
  const existing = await db.query.units.findFirst({
    where: eq(units.name, name.trim()),
  });
  if (existing) throw new Error("Unit with this name already exists");

  const [row] = await db
    .insert(units)
    .values({ name: name.trim(), shortName: shortName.trim() })
    .returning();

  await writeAuditLog({
    userId,
    action: "unit.created",
    entityType: "unit",
    entityId: row.id,
    details: { name: row.name, shortName: row.shortName },
    ip,
  });

  return row;
}

export async function updateUnit(
  id: string,
  name: string,
  shortName: string,
  userId: string,
  ip?: string
) {
  const [row] = await db
    .update(units)
    .set({ name: name.trim(), shortName: shortName.trim(), updatedAt: new Date() })
    .where(eq(units.id, id))
    .returning();

  await writeAuditLog({
    userId,
    action: "unit.updated",
    entityType: "unit",
    entityId: id,
    details: { name: row.name, shortName: row.shortName },
    ip,
  });

  return row;
}

export async function deleteUnit(id: string, userId: string, ip?: string) {
  const productsCount = await db
    .select({ count: count() })
    .from(products)
    .where(eq(products.unitId, id));

  if (productsCount[0].count > 0) {
    throw new Error("Cannot delete unit associated with existing products");
  }

  await db.delete(units).where(eq(units.id, id));

  await writeAuditLog({
    userId,
    action: "unit.deleted",
    entityType: "unit",
    entityId: id,
    ip,
  });
}
