"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { customerSchema } from "@/lib/validators";
import { createCustomer, updateCustomer } from "@/services/customers.service";
import { revalidatePath } from "next/cache";

export async function createCustomerAction(values: any) {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const cust = await createCustomer(parsed.data, user.id);
    revalidatePath("/customers");
    return { success: true, customer: cust };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateCustomerAction(id: string, values: any) {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const cust = await updateCustomer(id, parsed.data, user.id);
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true, customer: cust };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
