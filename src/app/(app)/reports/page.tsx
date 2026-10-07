import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getProfitReport,
  getStockValuationReport,
  getDebtAgingReport,
} from "@/services/reports.service";
import { getCompany } from "@/services/company.service";
import { ReportsView } from "./reports-view";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  await requirePermission(PERMISSIONS.REPORTS_VIEW);
  const comp = await getCompany();

  const profitData = await getProfitReport(sp.from, sp.to);
  const valuationData = await getStockValuationReport();
  const agingData = await getDebtAgingReport();

  return (
    <div className="space-y-6">
      <ReportsView
        profitData={profitData}
        valuationData={valuationData}
        agingData={agingData}
        currency={comp?.currency || "USD"}
      />
    </div>
  );
}
