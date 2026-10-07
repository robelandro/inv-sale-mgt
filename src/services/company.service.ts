import { db, client } from "@/db";
import {
  company,
  users,
  roles,
  categories,
  units,
  customers,
  auditLogs,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { writeAuditLog } from "./audit.service";
import { runSeed } from "@/db/seed";

export async function getCompany() {
  const comp = await db.query.company.findFirst();
  return comp || null;
}

export async function isCompanyOnboarded(): Promise<boolean> {
  const comp = await db.query.company.findFirst();
  return !!comp && !!comp.onboardedAt;
}

export interface CompleteOnboardingInput {
  companyName: string;
  currency: string;
  phone?: string;
  email?: string;
  address?: string;
  invoicePrefix?: string;
  logoUrl?: string;

  adminName: string;
  adminEmail: string;
  adminPassword: string;

  allowNegativeStock?: boolean;
  lowStockDefault?: number;
  allowCredit?: boolean;
  taxEnabled?: boolean;
  taxRate?: number;
  accentColor?: string;
}

export async function completeOnboarding(input: CompleteOnboardingInput, ip?: string) {
  const existing = await getCompany();
  if (existing && existing.onboardedAt) {
    throw new Error("Onboarding has already been completed.");
  }

  // Ensure roles & seed exist
  await runSeed();

  // Find Owner role
  const ownerRole = await db.query.roles.findFirst({
    where: eq(roles.key, "owner"),
  });
  if (!ownerRole) {
    throw new Error("Owner role not found in system.");
  }

  const passwordHash = await hashPassword(input.adminPassword);

  // Run in single transaction
  const result = await db.transaction(async (tx) => {
    // 1. Create or update company
    let compId = existing?.id;
    if (existing) {
      await tx
        .update(company)
        .set({
          name: input.companyName,
          currency: input.currency.toUpperCase(),
          phone: input.phone || null,
          email: input.email || null,
          address: input.address || null,
          invoicePrefix: input.invoicePrefix || "INV",
          logoUrl: input.logoUrl || null,
          allowNegativeStock: !!input.allowNegativeStock,
          lowStockDefault: input.lowStockDefault ?? 5,
          allowCredit: input.allowCredit !== false,
          taxEnabled: !!input.taxEnabled,
          taxRate: (input.taxRate ?? 0).toFixed(2),
          accentColor: input.accentColor || "indigo",
          onboardedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(company.id, existing.id));
    } else {
      const [newComp] = await tx
        .insert(company)
        .values({
          name: input.companyName,
          currency: input.currency.toUpperCase(),
          phone: input.phone || null,
          email: input.email || null,
          address: input.address || null,
          invoicePrefix: input.invoicePrefix || "INV",
          logoUrl: input.logoUrl || null,
          allowNegativeStock: !!input.allowNegativeStock,
          lowStockDefault: input.lowStockDefault ?? 5,
          allowCredit: input.allowCredit !== false,
          taxEnabled: !!input.taxEnabled,
          taxRate: (input.taxRate ?? 0).toFixed(2),
          accentColor: input.accentColor || "indigo",
          onboardedAt: new Date(),
        })
        .returning();
      compId = newComp.id;
    }

    // 2. Create Owner user
    const [adminUser] = await tx
      .insert(users)
      .values({
        name: input.adminName,
        email: input.adminEmail.toLowerCase().trim(),
        passwordHash,
        roleId: ownerRole.id,
        status: "active",
        mustChangePassword: false,
      })
      .returning();

    // 3. Write initial audit log
    await tx.insert(auditLogs).values({
      userId: adminUser.id,
      action: "onboarding.completed",
      entityType: "company",
      entityId: compId,
      details: {
        companyName: input.companyName,
        adminEmail: input.adminEmail,
      },
      ip: ip || null,
    });

    return { companyId: compId, user: adminUser };
  });

  return result;
}

export async function updateCompanySettings(
  data: Partial<CompleteOnboardingInput>,
  userId: string,
  ip?: string
) {
  const comp = await getCompany();
  if (!comp) {
    throw new Error("Company not found");
  }

  const oldValues = { ...comp };

  await db
    .update(company)
    .set({
      name: data.companyName ?? comp.name,
      currency: data.currency ? data.currency.toUpperCase() : comp.currency,
      phone: data.phone !== undefined ? data.phone : comp.phone,
      email: data.email !== undefined ? data.email : comp.email,
      address: data.address !== undefined ? data.address : comp.address,
      invoicePrefix: data.invoicePrefix ?? comp.invoicePrefix,
      logoUrl: data.logoUrl !== undefined ? data.logoUrl : comp.logoUrl,
      allowNegativeStock:
        data.allowNegativeStock !== undefined
          ? data.allowNegativeStock
          : comp.allowNegativeStock,
      lowStockDefault:
        data.lowStockDefault !== undefined
          ? data.lowStockDefault
          : comp.lowStockDefault,
      allowCredit:
        data.allowCredit !== undefined ? data.allowCredit : comp.allowCredit,
      taxEnabled:
        data.taxEnabled !== undefined ? data.taxEnabled : comp.taxEnabled,
      taxRate:
        data.taxRate !== undefined
          ? data.taxRate.toFixed(2)
          : comp.taxRate,
      accentColor: data.accentColor ?? comp.accentColor,
      updatedAt: new Date(),
    })
    .where(eq(company.id, comp.id));

  await writeAuditLog({
    userId,
    action: "company.settings_updated",
    entityType: "company",
    entityId: comp.id,
    details: { before: oldValues, updated: data },
    ip,
  });

  return getCompany();
}
