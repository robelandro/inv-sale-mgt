"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { productSchema } from "@/lib/validators";
import {
  createProduct,
  updateProduct,
  archiveProduct,
} from "@/services/products.service";
import { revalidatePath } from "next/cache";

export async function createProductAction(values: any) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  const parsed = productSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const product = await createProduct(
      {
        name: parsed.data.name,
        sku: parsed.data.sku || undefined,
        barcode: parsed.data.barcode || undefined,
        categoryId: parsed.data.categoryId || undefined,
        newCategoryName: parsed.data.newCategoryName || undefined,
        unitId: parsed.data.unitId || undefined,
        costPrice: parsed.data.costPrice,
        sellingPrice: parsed.data.sellingPrice,
        initialStock: parsed.data.initialStock,
        lowStockThreshold: parsed.data.lowStockThreshold,
        description: parsed.data.description,
        imageUrl: parsed.data.imageUrl,
      },
      user.id
    );
    revalidatePath("/products");
    return { success: true, product };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateProductAction(id: string, values: any) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  const parsed = productSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const product = await updateProduct(
      id,
      {
        name: parsed.data.name,
        sku: parsed.data.sku || "",
        barcode: parsed.data.barcode || undefined,
        categoryId: parsed.data.categoryId || undefined,
        unitId: parsed.data.unitId || undefined,
        costPrice: parsed.data.costPrice,
        sellingPrice: parsed.data.sellingPrice,
        lowStockThreshold: parsed.data.lowStockThreshold,
        description: parsed.data.description,
        imageUrl: parsed.data.imageUrl,
        isActive: parsed.data.isActive,
      },
      user.id
    );
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    return { success: true, product };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function archiveProductAction(id: string) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  try {
    const res = await archiveProduct(id, user.id);
    revalidatePath("/products");
    return { success: true, ...res };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
