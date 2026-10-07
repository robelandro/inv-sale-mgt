import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isCompanyOnboarded, getCompany } from "@/services/company.service";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const onboarded = await isCompanyOnboarded();
  if (!onboarded) {
    redirect("/onboarding");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const comp = await getCompany();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Sidebar */}
      <Sidebar
        user={user}
        companyName={comp?.name || "Inventory & Sales"}
        logoUrl={comp?.logoUrl}
        currency={comp?.currency || "USD"}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={user}
          companyName={comp?.name || "Inventory & Sales"}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
