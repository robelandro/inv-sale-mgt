import { isCompanyOnboarded, getCompany } from "@/services/company.service";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const onboarded = await isCompanyOnboarded();
  if (!onboarded) {
    redirect("/onboarding");
  }

  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const comp = await getCompany();

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border rounded-2xl shadow-xl p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          {comp?.logoUrl ? (
            <img
              src={comp.logoUrl}
              alt={comp.name}
              className="h-12 w-12 rounded-lg object-contain bg-white border p-1 mb-1"
            />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 mb-1">
              {comp?.name.slice(0, 2).toUpperCase() || "IS"}
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {comp?.name || "Inventory & Sales"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access your business operations
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
