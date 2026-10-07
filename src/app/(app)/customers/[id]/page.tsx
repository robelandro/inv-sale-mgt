import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/permissions";
import { getCustomerStatement } from "@/services/customers.service";
import { getCompany } from "@/services/company.service";
import { notFound } from "next/navigation";
import { CustomerDetailView } from "./customer-detail-view";

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const comp = await getCompany();

  try {
    const data = await getCustomerStatement(params.id);
    const canRecordPayment = can(user, PERMISSIONS.PAYMENTS_RECORD);
    const canManage = can(user, PERMISSIONS.CUSTOMERS_MANAGE);

    return (
      <div className="space-y-6">
        <CustomerDetailView
          customer={data.customer}
          currentBalance={data.currentBalance}
          statementEntries={data.entries}
          currency={comp?.currency || "USD"}
          canRecordPayment={canRecordPayment}
          canManage={canManage}
        />
      </div>
    );
  } catch (err) {
    notFound();
  }
}
