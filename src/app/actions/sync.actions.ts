"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { createSaleSchema } from "@/lib/validators";
import { createSale } from "@/services/sales.service";
import { revalidatePath } from "next/cache";

export interface SyncResult {
  clientOfflineId: string;
  success: boolean;
  saleId?: string;
  invoiceNo?: string;
  error?: string;
}

export async function syncOfflineSalesBatchAction(
  items: Array<{ clientOfflineId: string; payload: any }>
): Promise<{ success: boolean; results: SyncResult[] }> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  const results: SyncResult[] = [];

  for (const item of items) {
    const parsed = createSaleSchema.safeParse(item.payload);
    if (!parsed.success) {
      results.push({
        clientOfflineId: item.clientOfflineId,
        success: false,
        error: parsed.error.errors[0]?.message || "Validation failed for offline payload",
      });
      continue;
    }

    try {
      const notesWithOfflineTag = parsed.data.notes
        ? `${parsed.data.notes} [Synced from Offline: ${item.clientOfflineId}]`
        : `[Synced from Offline: ${item.clientOfflineId}]`;

      const sale = await createSale({
        ...parsed.data,
        notes: notesWithOfflineTag,
        userId: user.id,
      });

      if (sale) {
        results.push({
          clientOfflineId: item.clientOfflineId,
          success: true,
          saleId: sale.id,
          invoiceNo: sale.invoiceNo,
        });
      } else {
        results.push({
          clientOfflineId: item.clientOfflineId,
          success: false,
          error: "Sale transaction did not return a valid record",
        });
      }
    } catch (err: any) {
      results.push({
        clientOfflineId: item.clientOfflineId,
        success: false,
        error: err.message || "Failed to process offline sale on server",
      });
    }
  }

  // Revalidate pages if any sale was created
  if (results.some((r) => r.success)) {
    revalidatePath("/sales");
    revalidatePath("/products");
    revalidatePath("/debts");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
  }

  return { success: true, results };
}
