import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/permissions";
import { getSaleById } from "@/services/sales.service";
import { getCompany } from "@/services/company.service";
import { notFound } from "next/navigation";
import { SaleDetailView } from "./sale-detail-view";

export default async function SaleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);
  const comp = await getCompany();
  const sale = await getSaleById(params.id);

  if (!sale) {
    notFound();
  }

  const canVoid = can(user, PERMISSIONS.SALES_VOID);
  const canRecordPayment = can(user, PERMISSIONS.PAYMENTS_RECORD);

  return (
    <div className="space-y-6">
      <SaleDetailView
        sale={sale}
        company={comp}
        canVoid={canVoid}
        canRecordPayment={canRecordPayment}
      />
    </div>
  );
}
