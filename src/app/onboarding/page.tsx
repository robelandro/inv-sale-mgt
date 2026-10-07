import { isCompanyOnboarded } from "@/services/company.service";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const onboarded = await isCompanyOnboarded();
  if (onboarded) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-card border rounded-2xl shadow-xl p-6 sm:p-10">
        <OnboardingWizard />
      </div>
    </div>
  );
}
