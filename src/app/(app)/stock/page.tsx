import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/permissions";
import { getStockMovements } from "@/services/stock.service";
import { getProducts } from "@/services/products.service";
import { getCompany } from "@/services/company.service";
import { StockView } from "./stock-view";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const user = await requirePermission(PERMISSIONS.PRODUCTS_VIEW);
  const comp = await getCompany();
  const page = parseInt(sp.page || "1") || 1;

  const canReceive = can(user, PERMISSIONS.STOCK_RECEIVE);
  const canAdjust = can(user, PERMISSIONS.STOCK_ADJUST);
  const canViewCost = can(user, PERMISSIONS.PRODUCTS_VIEW_COST);

  const { items: movements, total, totalPages } = await getStockMovements({
    type: sp.type && sp.type !== "all" ? sp.type : undefined,
    page,
    pageSize: 25,
  });

  const { items: products } = await getProducts({
    pageSize: 1000,
    canViewCost,
    includeArchived: false,
  });

  return (
    <div className="space-y-6">
      <StockView
        movements={movements}
        total={total}
        totalPages={totalPages}
        currentPage={page}
        products={products}
        currency={comp?.currency || "USD"}
        canReceive={canReceive}
        canAdjust={canAdjust}
        canViewCost={canViewCost}
        selectedType={sp.type || "all"}
      />
    </div>
  );
}
