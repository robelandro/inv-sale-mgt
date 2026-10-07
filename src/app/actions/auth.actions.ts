"use server";

import { loginSchema, changePasswordSchema, updateProfileSchema } from "@/lib/validators";
import { verifyPassword, createSession, destroySession, getCurrentUser, requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { changeOwnPassword, updateOwnProfile } from "@/services/users.service";
import { writeAuditLog } from "@/services/audit.service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function loginAction(values: any) {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" };
  }

  const { email, password } = parsed.data;
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim()),
  });

  if (!user) {
    await writeAuditLog({
      action: "auth.login_failed",
      entityType: "user",
      details: { email, reason: "User not found" },
    });
    return { success: false, error: "Invalid email or password" };
  }

  if (user.status === "disabled") {
    await writeAuditLog({
      userId: user.id,
      action: "auth.login_failed",
      entityType: "user",
      entityId: user.id,
      details: { email, reason: "Account is disabled" },
    });
    return { success: false, error: "Your account has been disabled. Please contact an administrator." };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    await writeAuditLog({
      userId: user.id,
      action: "auth.login_failed",
      entityType: "user",
      entityId: user.id,
      details: { email, reason: "Incorrect password" },
    });
    return { success: false, error: "Invalid email or password" };
  }

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: new Date(), status: "active" })
    .where(eq(users.id, user.id));

  await createSession(user.id);

  await writeAuditLog({
    userId: user.id,
    action: "auth.login_success",
    entityType: "user",
    entityId: user.id,
    details: { email },
  });

  return { success: true, mustChangePassword: user.mustChangePassword };
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) {
    await writeAuditLog({
      userId: user.id,
      action: "auth.logout",
      entityType: "user",
      entityId: user.id,
    });
  }
  await destroySession();
  redirect("/login");
}

export async function changePasswordAction(values: any) {
  const user = await requireAuth();
  const parsed = changePasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" };
  }

  try {
    await changeOwnPassword({
      userId: user.id,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProfileAction(values: any) {
  const user = await requireAuth();
  const parsed = updateProfileSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input" };
  }

  try {
    await updateOwnProfile({
      userId: user.id,
      name: parsed.data.name,
    });
    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function acceptInviteAction(params: { token: string; password: string }) {
  const crypto = await import("crypto");
  const { hashPassword } = await import("@/lib/auth");
  const { invites } = await import("@/db/schema");
  const { and, gt, isNull } = await import("drizzle-orm");

  const tokenHash = crypto.createHash("sha256").update(params.token).digest("hex");
  const now = new Date();

  const inviteRow = await db.query.invites.findFirst({
    where: and(
      eq(invites.tokenHash, tokenHash),
      gt(invites.expiresAt, now),
      isNull(invites.usedAt)
    ),
  });

  if (!inviteRow) {
    return { success: false, error: "Invitation is invalid or has expired." };
  }

  const passwordHash = await hashPassword(params.password);

  await db
    .update(users)
    .set({
      passwordHash,
      status: "active",
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, inviteRow.userId));

  await db
    .update(invites)
    .set({ usedAt: new Date() })
    .where(eq(invites.id, inviteRow.id));

  await createSession(inviteRow.userId);

  await writeAuditLog({
    userId: inviteRow.userId,
    action: "user.invite_accepted",
    entityType: "user",
    entityId: inviteRow.userId,
  });

  return { success: true };
}

