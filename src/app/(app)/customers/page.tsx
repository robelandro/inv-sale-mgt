import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/permissions";
import { getCustomers } from "@/services/customers.service";
import { getCompany } from "@/services/company.service";
import { CustomersView } from "./customers-view";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const comp = await getCompany();
  const page = parseInt(searchParams.page || "1") || 1;
  const canManage = can(user, PERMISSIONS.CUSTOMERS_MANAGE);

  const { items, total, totalPages } = await getCustomers({
    search: searchParams.q,
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
        searchQuery={searchParams.q || ""}
      />
    </div>
  );
}
