import { redirect } from "next/navigation";
import { isCompanyOnboarded } from "@/services/company.service";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const onboarded = await isCompanyOnboarded();
  if (!onboarded) {
    redirect("/onboarding");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  redirect("/dashboard");
}
