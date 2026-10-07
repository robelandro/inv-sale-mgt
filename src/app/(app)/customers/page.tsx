import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/permissions";
import { getCustomers } from "@/services/customers.service";
import { getCompany } from "@/services/company.service";
import { CustomersView } from "./customers-view";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const comp = await getCompany();
  const page = parseInt(sp.page || "1") || 1;
  const canManage = can(user, PERMISSIONS.CUSTOMERS_MANAGE);

  const { items, total, totalPages } = await getCustomers({
    search: sp.q,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6">
      <CustomersView
        customers={items}
        total={total}
        totalPages={totalPages}
        currentPage={page}
        currency={comp?.currency || "USD"}
        canManage={canManage}
        searchQuery={sp.q || ""}
      />
    </div>
  );
}
