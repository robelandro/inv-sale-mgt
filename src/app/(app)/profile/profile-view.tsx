"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction, updateProfileAction } from "@/app/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Lock, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import type { AuthUser } from "@/lib/auth";

export function ProfileView({
  user,
  forcedPasswordChange,
}: {
  user: AuthUser;
  forcedPasswordChange: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslation();

  // Profile Name
  const [name, setName] = React.useState(user.name);
  const [isSavingName, setIsSavingName] = React.useState(false);

  // Password Change
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isChangingPass, setIsChangingPass] = React.useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSavingName(true);
    try {
      const res = await updateProfileAction({ name: name.trim() });
      if (!res.success) {
        toast.error(res.error || "Failed to update profile name");
        return;
      }
      toast.success(t.profile.profileUpdated);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changePasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!res.success) {
        toast.error(res.error || "Password change failed");
        return;
      }

      toast.success(t.profile.passwordChanged);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (forcedPasswordChange) {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.profile.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t.profile.subtitle}
        </p>
      </div>

      {forcedPasswordChange && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-sm">{t.profile.passwordChangeRequired}</p>
            <p>
              {t.profile.passwordChangeRequiredDesc}
            </p>
          </div>
        </div>
      )}

      {/* Account Info */}
      <Card className="rounded-card border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> {t.profile.profileDetails}
          </CardTitle>
          <CardDescription className="text-xs">
            {t.profile.profileDetailsDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateName} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pName">{t.profile.fullName}</Label>
              <Input
                id="pName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pEmail">{t.profile.emailAddress}</Label>
              <Input id="pEmail" value={user.email} disabled className="bg-muted/50" />
            </div>

            <div className="space-y-1.5">
              <Label>{t.profile.assignedRole}</Label>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-md">
                  <Shield className="h-3.5 w-3.5" />
                  {user.roleName} ({user.roleKey})
                </span>
              </div>
            </div>

            <Button type="submit" size="sm" disabled={isSavingName || name === user.name}>
              {isSavingName && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              {t.profile.saveProfile}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card className="rounded-card border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" /> {t.profile.changePassword}
          </CardTitle>
          <CardDescription className="text-xs">
            {t.profile.changePasswordDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="curPass">{t.profile.currentPassword}</Label>
              <Input
                id="curPass"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPass">{t.profile.newPassword}</Label>
              <Input
                id="newPass"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confPass">{t.profile.confirmNewPassword}</Label>
              <Input
                id="confPass"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={isChangingPass || !currentPassword || !newPassword}
            >
              {isChangingPass && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              {t.profile.updatePassword}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Granted Permissions List */}
      <Card className="rounded-card border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">{t.profile.grantedPermissions}</CardTitle>
          <CardDescription className="text-xs">
            {t.profile.grantedPermissionsDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {user.permissions.map((p) => (
              <span
                key={p}
                className="bg-muted px-2 py-1 rounded text-[11px] font-mono text-muted-foreground"
              >
                {p}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
