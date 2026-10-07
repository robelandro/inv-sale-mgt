import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions, roles, rolePermissions, permissions } from "@/db/schema";
import { PermissionKey, can } from "./permissions";

const SESSION_COOKIE_NAME = "inv_session";
const SESSION_MAX_AGE_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  status: string;
  mustChangePassword: boolean;
  roleId: string;
  roleKey: string;
  roleName: string;
  permissions: string[];
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_MAX_AGE_DAYS);

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      await db.delete(sessions).where(eq(sessions.token, token));
    } catch (e) {
      // Ignore DB errors during session cleanup
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const now = new Date();

  // Find session
  const sessionRow = await db.query.sessions.findFirst({
    where: and(eq(sessions.token, token), gt(sessions.expiresAt, now)),
  });

  if (!sessionRow) {
    return null;
  }

  // Get user
  const user = await db.query.users.findFirst({
    where: eq(users.id, sessionRow.userId),
  });

  // If user doesn't exist or is disabled, revoke immediately
  if (!user || user.status !== "active") {
    await destroySession();
    return null;
  }

  // Get role
  const role = await db.query.roles.findFirst({
    where: eq(roles.id, user.roleId),
  });

  if (!role) return null;

  // Get user permissions
  const rp = await db
    .select({
      permKey: permissions.key,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, role.id));

  const permissionKeys = rp.map((r) => r.permKey);

  // Sliding session update in background
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + SESSION_MAX_AGE_DAYS);
  db.update(sessions)
    .set({ expiresAt: newExpiry })
    .where(eq(sessions.id, sessionRow.id))
    .catch(() => {});

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    roleId: role.id,
    roleKey: role.key,
    roleName: role.name,
    permissions: permissionKeys,
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requirePermission(permission: PermissionKey): Promise<AuthUser> {
  const user = await requireAuth();
  if (!can(user, permission)) {
    throw new Error(`FORBIDDEN: Missing permission '${permission}'`);
  }
  return user;
}
