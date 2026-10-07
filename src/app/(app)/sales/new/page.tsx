import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/permissions";
import { getProducts } from "@/services/products.service";
import { getCustomers } from "@/services/customers.service";
import { getCompany } from "@/services/company.service";
import { PosTerminal } from "./pos-terminal";

export default async function NewSalePage() {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  const comp = await getCompany();

  const { items: products } = await getProducts({
    pageSize: 1000,
    includeArchived: false,
    canViewCost: false,
  });

  const { items: customers } = await getCustomers({
    pageSize: 1000,
  });

  const canDiscount = can(user, PERMISSIONS.SALES_DISCOUNT);

  return (
    <div className="space-y-4">
      <PosTerminal
        products={products}
        customers={customers}
        company={comp}
        canDiscount={canDiscount}
      />
    </div>
  );
}
