"use server";

import { onboardingSchema } from "@/lib/validators";
import { completeOnboarding, isCompanyOnboarded } from "@/services/company.service";
import { createSession } from "@/lib/auth";

export async function completeOnboardingAction(values: any) {
  const onboarded = await isCompanyOnboarded();
  if (onboarded) {
    return { success: false, error: "System is already onboarded." };
  }

  const parsed = onboardingSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Validation failed",
    };
  }

  try {
    const result = await completeOnboarding(parsed.data);
    // Automatically create session for newly created owner
    await createSession(result.user.id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
