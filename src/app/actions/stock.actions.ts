"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { stockAdjustmentSchema, receiveStockSchema } from "@/lib/validators";
import { adjustStock, receiveStock } from "@/services/stock.service";
import { revalidatePath } from "next/cache";

export async function adjustStockAction(values: any) {
  const user = await requirePermission(PERMISSIONS.STOCK_ADJUST);
  const parsed = stockAdjustmentSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const res = await adjustStock({
      productId: parsed.data.productId,
      qtyChange: parsed.data.qtyChange,
      reason: parsed.data.reason,
      userId: user.id,
    });
    revalidatePath("/stock");
    revalidatePath("/products");
    revalidatePath(`/products/${parsed.data.productId}`);
    return { success: true, ...res };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function receiveStockAction(values: any) {
  const user = await requirePermission(PERMISSIONS.STOCK_RECEIVE);
  const parsed = receiveStockSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const res = await receiveStock({
      items: parsed.data.items,
      supplier: parsed.data.supplier,
      note: parsed.data.note,
      userId: user.id,
    });
    revalidatePath("/stock");
    revalidatePath("/products");
    return { success: true, count: res.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
