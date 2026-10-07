import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/permissions";
import { getProducts } from "@/services/products.service";
import { getCategories, getUnits } from "@/services/catalog.service";
import { getCompany } from "@/services/company.service";
import { ProductsView } from "./products-view";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    stock?: "all" | "in_stock" | "low" | "out";
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const user = await requirePermission(PERMISSIONS.PRODUCTS_VIEW);
  const comp = await getCompany();
  const page = parseInt(sp.page || "1") || 1;
  const canViewCost = can(user, PERMISSIONS.PRODUCTS_VIEW_COST);
  const canManage = can(user, PERMISSIONS.PRODUCTS_MANAGE);

  const { items, total, totalPages } = await getProducts({
    search: sp.q,
    categoryId: sp.category,
    stockStatus: sp.stock || "all",
    canViewCost,
    page,
    pageSize: 20,
  });

  const categories = await getCategories();
  const units = await getUnits();

  return (
    <div className="space-y-6">
      <ProductsView
        initialProducts={items}
        total={total}
        totalPages={totalPages}
        currentPage={page}
        categories={categories}
        units={units}
        currency={comp?.currency || "USD"}
        canManage={canManage}
        canViewCost={canViewCost}
        searchParams={sp}
      />
    </div>
  );
}
