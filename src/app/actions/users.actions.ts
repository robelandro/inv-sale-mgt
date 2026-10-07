"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { createUserSchema, updateUserSchema } from "@/lib/validators";
import {
  createUser,
  updateUser,
  setUserStatus,
  resetUserPassword,
} from "@/services/users.service";
import { revalidatePath } from "next/cache";

export async function createUserAction(values: any) {
  const caller = await requirePermission(PERMISSIONS.USERS_MANAGE);
  const parsed = createUserSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
  }

  try {
    const result = await createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      roleId: parsed.data.roleId,
      password: parsed.data.password || undefined,
      isInvite: parsed.data.isInvite,
      creatorId: caller.id,
      creatorRoleKey: caller.roleKey,
    });
    revalidatePath("/settings/users");
    return { success: true, inviteToken: result.inviteToken };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateUserAction(values: any) {
  const caller = await requirePermission(PERMISSIONS.USERS_MANAGE);
  const parsed = updateUserSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
  }

  try {
    await updateUser({
      id: parsed.data.id,
      name: parsed.data.name,
      roleId: parsed.data.roleId,
      updaterId: caller.id,
      updaterRoleKey: caller.roleKey,
    });
    revalidatePath("/settings/users");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function setUserStatusAction(id: string, status: "active" | "disabled") {
  const caller = await requirePermission(PERMISSIONS.USERS_MANAGE);
  try {
    await setUserStatus({
      id,
      status,
      updaterId: caller.id,
      updaterRoleKey: caller.roleKey,
    });
    revalidatePath("/settings/users");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetUserPasswordAction(id: string) {
  const caller = await requirePermission(PERMISSIONS.USERS_MANAGE);
  try {
    const result = await resetUserPassword({
      id,
      updaterId: caller.id,
      updaterRoleKey: caller.roleKey,
    });
    revalidatePath("/settings/users");
    return { success: true, tempPassword: result.tempPassword };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
