import { db } from "@/db";
import { invites, users } from "@/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { AcceptInviteForm } from "./accept-invite-form";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const now = new Date();

  const inviteRow = await db.query.invites.findFirst({
    where: and(
      eq(invites.tokenHash, tokenHash),
      gt(invites.expiresAt, now),
      isNull(invites.usedAt)
    ),
  });

  if (!inviteRow) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="max-w-md bg-card border rounded-2xl p-8 text-center space-y-3">
          <h1 className="text-xl font-bold text-destructive">Invalid or Expired Invitation</h1>
          <p className="text-sm text-muted-foreground">
            This invitation link is either invalid, already used, or has expired after 72 hours. Please contact your system administrator for a new invite.
          </p>
        </div>
      </div>
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, inviteRow.userId),
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Activate Account</h1>
          <p className="text-sm text-muted-foreground">
            Welcome, <span className="font-semibold text-foreground">{user.name}</span>! Set your password to complete registration.
          </p>
        </div>

        <AcceptInviteForm token={token} email={user.email} />
      </div>
    </div>
  );
}
