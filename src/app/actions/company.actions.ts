"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { companySettingsSchema } from "@/lib/validators";
import { updateCompanySettings } from "@/services/company.service";
import { revalidatePath } from "next/cache";

export async function updateCompanyAction(values: any) {
  const user = await requirePermission(PERMISSIONS.COMPANY_MANAGE);
  const parsed = companySettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const updated = await updateCompanySettings(
      {
        companyName: parsed.data.name,
        currency: parsed.data.currency,
        phone: parsed.data.phone || undefined,
        email: parsed.data.email || undefined,
        address: parsed.data.address || undefined,
        invoicePrefix: parsed.data.invoicePrefix,
        allowNegativeStock: parsed.data.allowNegativeStock,
        lowStockDefault: parsed.data.lowStockDefault,
        allowCredit: parsed.data.allowCredit,
        taxEnabled: parsed.data.taxEnabled,
        taxRate: parsed.data.taxRate,
        accentColor: parsed.data.accentColor,
        logoUrl: parsed.data.logoUrl || undefined,
      },
      user.id
    );
    revalidatePath("/settings/company");
    revalidatePath("/dashboard");
    return { success: true, company: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
