import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCategories, getUnits } from "@/services/catalog.service";
import { CatalogView } from "./catalog-view";

export default async function CatalogPage() {
  await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  const categories = await getCategories();
  const units = await getUnits();

  return (
    <div className="space-y-6">
      <CatalogView categories={categories} units={units} />
    </div>
  );
}
