import { db } from "@/db";
import { users, roles, sessions, invites, auditLogs } from "@/db/schema";
import { eq, and, count, desc, ne } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { writeAuditLog } from "./audit.service";
import crypto from "crypto";

export async function getUsers() {
  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      roleId: users.roleId,
      roleName: roles.name,
      roleKey: roles.key,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .orderBy(desc(users.createdAt));

  return userRows;
}

export async function getRoles() {
  return db.query.roles.findMany({
    orderBy: (roles, { asc }) => [asc(roles.name)],
  });
}

export async function getUserById(id: string) {
  const row = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      roleId: users.roleId,
      roleName: roles.name,
      roleKey: roles.key,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, id))
    .limit(1);

  return row[0] || null;
}

export async function createUser(params: {
  name: string;
  email: string;
  roleId: string;
  password?: string;
  isInvite?: boolean;
  creatorId: string;
  creatorRoleKey: string;
  ip?: string;
}) {
  const targetRole = await db.query.roles.findFirst({
    where: eq(roles.id, params.roleId),
  });
  if (!targetRole) {
    throw new Error("Selected role does not exist");
  }

  // Admin cannot create Owners
  if (params.creatorRoleKey === "admin" && targetRole.key === "owner") {
    throw new Error("Admins cannot create users with the Owner role");
  }

  const existingEmail = await db.query.users.findFirst({
    where: eq(users.email, params.email.toLowerCase().trim()),
  });
  if (existingEmail) {
    throw new Error("A user with this email already exists");
  }

  // Handle password or invite token
  let initialPassword = params.password;
  let inviteToken: string | null = null;
  let isInvited = false;

  if (params.isInvite || !initialPassword) {
    inviteToken = crypto.randomBytes(32).toString("hex");
    initialPassword = crypto.randomBytes(16).toString("hex"); // placeholder hashed password
    isInvited = true;
  }

  const passwordHash = await hashPassword(initialPassword!);

  const [newUser] = await db
    .insert(users)
    .values({
      name: params.name,
      email: params.email.toLowerCase().trim(),
      passwordHash,
      roleId: params.roleId,
      status: isInvited ? "invited" : "active",
      mustChangePassword: !isInvited && !!params.password, // force change if temp password set
    })
    .returning();

  if (inviteToken) {
    const tokenHash = crypto.createHash("sha256").update(inviteToken).digest("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72 hours token

    await db.insert(invites).values({
      userId: newUser.id,
      tokenHash,
      expiresAt,
    });
  }

  await writeAuditLog({
    userId: params.creatorId,
    action: "user.created",
    entityType: "user",
    entityId: newUser.id,
    details: {
      name: params.name,
      email: params.email,
      role: targetRole.key,
      isInvite: isInvited,
    },
    ip: params.ip,
  });

  return {
    user: newUser,
    inviteToken,
  };
}

export async function updateUser(params: {
  id: string;
  name: string;
  roleId: string;
  updaterId: string;
  updaterRoleKey: string;
  ip?: string;
}) {
  const existingUser = await getUserById(params.id);
  if (!existingUser) {
    throw new Error("User not found");
  }

  // Cannot edit own role
  if (params.updaterId === params.id && params.roleId !== existingUser.roleId) {
    throw new Error("You cannot change your own role");
  }

  const targetRole = await db.query.roles.findFirst({
    where: eq(roles.id, params.roleId),
  });
  if (!targetRole) {
    throw new Error("Selected role does not exist");
  }

  // Admin cannot edit Owners or promote anyone to Owner
  if (params.updaterRoleKey === "admin") {
    if (existingUser.roleKey === "owner") {
      throw new Error("Admins cannot edit Owner accounts");
    }
    if (targetRole.key === "owner") {
      throw new Error("Admins cannot promote users to Owner");
    }
  }

  // Last active owner guardrail
  if (existingUser.roleKey === "owner" && targetRole.key !== "owner") {
    const ownerRole = await db.query.roles.findFirst({
      where: eq(roles.key, "owner"),
    });
    const activeOwnerCount = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.roleId, ownerRole!.id), eq(users.status, "active")));

    if (activeOwnerCount[0].count <= 1) {
      throw new Error("Cannot demote the last active Owner");
    }
  }

  await db
    .update(users)
    .set({
      name: params.name,
      roleId: params.roleId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, params.id));

  await writeAuditLog({
    userId: params.updaterId,
    action: "user.updated",
    entityType: "user",
    entityId: params.id,
    details: {
      before: { name: existingUser.name, role: existingUser.roleKey },
      after: { name: params.name, role: targetRole.key },
    },
    ip: params.ip,
  });

  return getUserById(params.id);
}

export async function setUserStatus(params: {
  id: string;
  status: "active" | "disabled";
  updaterId: string;
  updaterRoleKey: string;
  ip?: string;
}) {
  if (params.updaterId === params.id) {
    throw new Error("You cannot disable your own account");
  }

  const targetUser = await getUserById(params.id);
  if (!targetUser) {
    throw new Error("User not found");
  }

  if (params.updaterRoleKey === "admin" && targetUser.roleKey === "owner") {
    throw new Error("Admins cannot modify Owner accounts");
  }

  // Guardrail: cannot disable the last active Owner
  if (targetUser.roleKey === "owner" && params.status === "disabled") {
    const ownerRole = await db.query.roles.findFirst({
      where: eq(roles.key, "owner"),
    });
    const activeOwnerCount = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.roleId, ownerRole!.id), eq(users.status, "active")));

    if (activeOwnerCount[0].count <= 1) {
      throw new Error("Cannot disable the last active Owner");
    }
  }

  await db
    .update(users)
    .set({
      status: params.status,
      updatedAt: new Date(),
    })
    .where(eq(users.id, params.id));

  // If disabling, revoke all active sessions immediately
  if (params.status === "disabled") {
    await db.delete(sessions).where(eq(sessions.userId, params.id));
  }

  await writeAuditLog({
    userId: params.updaterId,
    action: `user.${params.status}`,
    entityType: "user",
    entityId: params.id,
    details: { newStatus: params.status },
    ip: params.ip,
  });

  return getUserById(params.id);
}

export async function resetUserPassword(params: {
  id: string;
  updaterId: string;
  updaterRoleKey: string;
  ip?: string;
}) {
  const targetUser = await getUserById(params.id);
  if (!targetUser) throw new Error("User not found");

  if (params.updaterRoleKey === "admin" && targetUser.roleKey === "owner") {
    throw new Error("Admins cannot reset Owner passwords");
  }

  const tempPassword = crypto.randomBytes(6).toString("hex") + "!A1";
  const passwordHash = await hashPassword(tempPassword);

  await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, params.id));

  // Revoke existing sessions so user is forced to log in with temp password
  await db.delete(sessions).where(eq(sessions.userId, params.id));

  await writeAuditLog({
    userId: params.updaterId,
    action: "user.password_reset",
    entityType: "user",
    entityId: params.id,
    details: { reason: "Admin requested password reset" },
    ip: params.ip,
  });

  return { tempPassword };
}

export async function changeOwnPassword(params: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  ip?: string;
}) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, params.userId),
  });
  if (!user) throw new Error("User not found");

  const valid = await verifyPassword(params.currentPassword, user.passwordHash);
  if (!valid) {
    throw new Error("Current password is incorrect");
  }

  const newHash = await hashPassword(params.newPassword);
  await db
    .update(users)
    .set({
      passwordHash: newHash,
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, params.userId));

  await writeAuditLog({
    userId: params.userId,
    action: "user.password_changed",
    entityType: "user",
    entityId: params.userId,
    ip: params.ip,
  });
}

export async function updateOwnProfile(params: {
  userId: string;
  name: string;
  ip?: string;
}) {
  await db
    .update(users)
    .set({
      name: params.name,
      updatedAt: new Date(),
    })
    .where(eq(users.id, params.userId));

  await writeAuditLog({
    userId: params.userId,
    action: "user.profile_updated",
    entityType: "user",
    entityId: params.userId,
    details: { newName: params.name },
    ip: params.ip,
  });
}
