import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/services/company.service";
import { getDashboardMetrics } from "@/services/reports.service";
import { can, PERMISSIONS } from "@/lib/permissions";
import { DashboardView } from "./dashboard-view";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: "today" | "7d" | "30d"; from?: string; to?: string };
}) {
  const user = await getCurrentUser();
  const comp = await getCompany();
  const period = searchParams.period || "30d";
  const canViewProfit = can(user, PERMISSIONS.REPORTS_VIEW);

  const metrics = await getDashboardMetrics({
    period,
    fromDate: searchParams.from,
    toDate: searchParams.to,
    canViewProfit,
  });

  return (
    <div className="space-y-6">
      <DashboardView
        initialMetrics={metrics}
        companyCurrency={comp?.currency || "USD"}
        canViewProfit={canViewProfit}
        period={period}
      />
    </div>
  );
}
