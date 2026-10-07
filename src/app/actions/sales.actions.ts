"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { createSaleSchema, voidSaleSchema } from "@/lib/validators";
import { createSale, voidSale } from "@/services/sales.service";
import { revalidatePath } from "next/cache";

export async function createSaleAction(values: any) {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  const parsed = createSaleSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const sale = await createSale({
      ...parsed.data,
      userId: user.id,
    });
    revalidatePath("/sales");
    revalidatePath("/products");
    revalidatePath("/debts");
    revalidatePath("/dashboard");
    return { success: true, sale };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function voidSaleAction(values: any) {
  const user = await requirePermission(PERMISSIONS.SALES_VOID);
  const parsed = voidSaleSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const sale = await voidSale({
      saleId: parsed.data.saleId,
      reason: parsed.data.reason,
      userId: user.id,
    });
    revalidatePath("/sales");
    revalidatePath(`/sales/${parsed.data.saleId}`);
    revalidatePath("/products");
    revalidatePath("/debts");
    revalidatePath("/dashboard");
    return { success: true, sale };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
