import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/permissions";
import { getDebts } from "@/services/payments.service";
import { getCompany } from "@/services/company.service";
import { DebtsView } from "./debts-view";

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: { q?: string; overdue?: string; page?: string };
}) {
  const user = await requirePermission(PERMISSIONS.DEBTS_VIEW);
  const comp = await getCompany();
  const page = parseInt(searchParams.page || "1") || 1;
  const overdueOnly = searchParams.overdue === "true";
  const canRecordPayment = can(user, PERMISSIONS.PAYMENTS_RECORD);

  const { items: debts, total, totalPages } = await getDebts({
    search: searchParams.q,
    overdueOnly,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6">
      <DebtsView
        debts={debts}
        total={total}
        totalPages={totalPages}
        currentPage={page}
        currency={comp?.currency || "USD"}
        canRecordPayment={canRecordPayment}
        searchQuery={searchParams.q || ""}
        overdueOnly={overdueOnly}
      />
    </div>
  );
}
