import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/permissions";
import { getProductById } from "@/services/products.service";
import { getStockMovements } from "@/services/stock.service";
import { getCategories, getUnits } from "@/services/catalog.service";
import { getCompany } from "@/services/company.service";
import { notFound } from "next/navigation";
import { ProductDetailView } from "./product-detail-view";

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_VIEW);
  const comp = await getCompany();
  const canViewCost = can(user, PERMISSIONS.PRODUCTS_VIEW_COST);
  const canManage = can(user, PERMISSIONS.PRODUCTS_MANAGE);
  const canAdjustStock = can(user, PERMISSIONS.STOCK_ADJUST);

  const product = await getProductById(params.id, canViewCost);
  if (!product) {
    notFound();
  }

  const { items: movements } = await getStockMovements({
    productId: params.id,
    pageSize: 50,
  });

  const categories = await getCategories();
  const units = await getUnits();

  return (
    <div className="space-y-6">
      <ProductDetailView
        product={product}
        movements={movements}
        categories={categories}
        units={units}
        currency={comp?.currency || "USD"}
        canManage={canManage}
        canViewCost={canViewCost}
        canAdjustStock={canAdjustStock}
      />
    </div>
  );
}
