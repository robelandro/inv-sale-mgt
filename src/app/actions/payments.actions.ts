"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { recordPaymentSchema, reversePaymentSchema } from "@/lib/validators";
import { recordPayment, reversePayment } from "@/services/payments.service";
import { revalidatePath } from "next/cache";

export async function recordPaymentAction(values: any) {
  const user = await requirePermission(PERMISSIONS.PAYMENTS_RECORD);
  const parsed = recordPaymentSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const res = await recordPayment({
      customerId: parsed.data.customerId,
      saleId: parsed.data.saleId || undefined,
      amount: parsed.data.amount,
      method: parsed.data.method,
      paidAt: parsed.data.paidAt || undefined,
      note: parsed.data.note || undefined,
      userId: user.id,
    });
    revalidatePath("/debts");
    revalidatePath("/customers");
    revalidatePath(`/customers/${parsed.data.customerId}`);
    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return { success: true, payment: res.payment };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function reversePaymentAction(values: any) {
  const user = await requirePermission(PERMISSIONS.COMPANY_MANAGE);
  const parsed = reversePaymentSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const res = await reversePayment({
      paymentId: parsed.data.paymentId,
      reason: parsed.data.reason,
      userId: user.id,
    });
    revalidatePath("/debts");
    revalidatePath("/customers");
    revalidatePath("/sales");
    revalidatePath("/dashboard");
    return { success: true, payment: res };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
