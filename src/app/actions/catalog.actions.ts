"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { categorySchema, unitSchema } from "@/lib/validators";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createUnit,
  updateUnit,
  deleteUnit,
} from "@/services/catalog.service";
import { revalidatePath } from "next/cache";

export async function createCategoryAction(name: string) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  const parsed = categorySchema.safeParse({ name });
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  try {
    const res = await createCategory(parsed.data.name, user.id);
    revalidatePath("/settings/catalog");
    return { success: true, item: res };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateCategoryAction(id: string, name: string) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  const parsed = categorySchema.safeParse({ name });
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  try {
    const res = await updateCategory(id, parsed.data.name, user.id);
    revalidatePath("/settings/catalog");
    return { success: true, item: res };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteCategoryAction(id: string) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  try {
    await deleteCategory(id, user.id);
    revalidatePath("/settings/catalog");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createUnitAction(name: string, shortName: string) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  const parsed = unitSchema.safeParse({ name, shortName });
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  try {
    const res = await createUnit(parsed.data.name, parsed.data.shortName, user.id);
    revalidatePath("/settings/catalog");
    return { success: true, item: res };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateUnitAction(id: string, name: string, shortName: string) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  const parsed = unitSchema.safeParse({ name, shortName });
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message };

  try {
    const res = await updateUnit(id, parsed.data.name, parsed.data.shortName, user.id);
    revalidatePath("/settings/catalog");
    return { success: true, item: res };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteUnitAction(id: string) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  try {
    await deleteUnit(id, user.id);
    revalidatePath("/settings/catalog");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
