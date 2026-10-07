import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCompany } from "@/services/company.service";
import { CompanySettingsView } from "./company-settings-view";

export default async function CompanySettingsPage() {
  await requirePermission(PERMISSIONS.COMPANY_MANAGE);
  const comp = await getCompany();

  return (
    <div className="space-y-6">
      <CompanySettingsView initialCompany={comp} />
    </div>
  );
}
