"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  createUserAction,
  updateUserAction,
  setUserStatusAction,
  resetUserPasswordAction,
} from "@/app/actions/users.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate, getStatusBadgeVariant } from "@/lib/format";
import { toast } from "sonner";
import {
  UserPlus,
  Shield,
  Key,
  Ban,
  CheckCircle,
  Copy,
  Loader2,
  Edit,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";

interface UsersViewProps {
  users: any[];
  roles: any[];
  currentUser: AuthUser;
}

export function UsersView({ users, roles, currentUser }: UsersViewProps) {
  const router = useRouter();

  // Create User State
  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [roleId, setRoleId] = React.useState(roles[0]?.id || "");
  const [tempPassword, setTempPassword] = React.useState("");
  const [isInvite, setIsInvite] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  // Edit User State
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<any>(null);
  const [editName, setEditName] = React.useState("");
  const [editRoleId, setEditRoleId] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Result dialog for temp password / invite link
  const [resultDialog, setResultDialog] = React.useState<{
    title: string;
    message: string;
    copyValue: string;
  } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    setIsCreating(true);
    try {
      const res = await createUserAction({
        name,
        email,
        roleId,
        password: tempPassword || undefined,
        isInvite,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to create user");
        setIsCreating(false);
        return;
      }

      toast.success("User created successfully!");
      setCreateOpen(false);

      if (res.inviteToken) {
        const link = `${window.location.origin}/accept-invite/${res.inviteToken}`;
        setResultDialog({
          title: "User Invitation Created",
          message:
            "Share this invitation link with the user. It is valid for 72 hours:",
          copyValue: link,
        });
      } else if (tempPassword) {
        setResultDialog({
          title: "Temporary Password Created",
          message:
            "Share this temporary password with the user. They will be forced to change it on their first login:",
          copyValue: tempPassword,
        });
      }

      setName("");
      setEmail("");
      setTempPassword("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (u: any) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditRoleId(u.roleId);
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdating(true);
    try {
      const res = await updateUserAction({
        id: editingUser.id,
        name: editName,
        roleId: editRoleId,
      });

      if (!res.success) {
        toast.error(res.error || "Update failed");
        setIsUpdating(false);
        return;
      }

      toast.success("User updated successfully");
      setEditOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleStatus = async (u: any) => {
    const newStatus = u.status === "active" ? "disabled" : "active";
    if (
      !confirm(
        `Are you sure you want to ${
          newStatus === "disabled" ? "disable" : "enable"
        } account for "${u.name}"?`
      )
    )
      return;

    try {
      const res = await setUserStatusAction(u.id, newStatus);
      if (!res.success) {
        toast.error(res.error || "Failed to change user status");
        return;
      }
      toast.success(
        `User ${newStatus === "disabled" ? "disabled" : "activated"}`
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleResetPassword = async (u: any) => {
    if (!confirm(`Reset password for "${u.name}"?`)) return;

    try {
      const res = await resetUserPasswordAction(u.id);
      if (!res.success) {
        toast.error(res.error || "Failed to reset password");
        return;
      }
      setResultDialog({
        title: "Password Reset Generated",
        message: `Temporary password for ${u.name} (user will be forced to change it at next login):`,
        copyValue: res.tempPassword!,
      });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff & User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage employee access, assign functional roles, and enforce security policies
          </p>
        </div>

        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-xs uppercase text-muted-foreground font-medium">
              <tr>
                <th className="py-3 px-4 text-left font-medium">Name</th>
                <th className="py-3 px-4 text-left font-medium">Email</th>
                <th className="py-3 px-4 text-left font-medium">Role</th>
                <th className="py-3 px-4 text-center font-medium">Status</th>
                <th className="py-3 px-4 text-left font-medium">Last Login</th>
                <th className="py-3 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => {
                const badge = getStatusBadgeVariant(u.status);
                const isSelf = u.id === currentUser.id;
                const isOwner = u.roleKey === "owner";
                const isAdmin = currentUser.roleKey === "admin";
                const canModifyThisUser = !isAdmin || !isOwner;

                return (
                  <tr key={u.id} className="hover:bg-muted/20">
                    <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-2">
                      <span>{u.name}</span>
                      {isSelf && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                          You
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-muted px-2 py-0.5 rounded capitalize">
                        <Shield className="h-3 w-3 text-primary" />
                        {u.roleName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt, "MMM d, yyyy HH:mm") : "Never"}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {canModifyThisUser && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(u)}
                            className="h-7 text-xs"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetPassword(u)}
                            className="h-7 text-xs"
                            title="Reset password"
                          >
                            <Key className="h-3.5 w-3.5" />
                          </Button>
                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(u)}
                              className={`h-7 text-xs ${
                                u.status === "active"
                                  ? "text-destructive hover:bg-destructive/10"
                                  : "text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={u.status === "active" ? "Disable user" : "Enable user"}
                            >
                              {u.status === "active" ? (
                                <Ban className="h-3.5 w-3.5" />
                              ) : (
                                <CheckCircle className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="uName">Full Name *</Label>
              <Input
                id="uName"
                placeholder="e.g. Alex Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="uEmail">Email Address *</Label>
              <Input
                id="uEmail"
                type="email"
                placeholder="alex@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Assigned Role *</Label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                {roles
                  .filter((r) => currentUser.roleKey === "owner" || r.key !== "owner")
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="invChk"
                  checked={isInvite}
                  onChange={(e) => setIsInvite(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="invChk" className="text-xs font-medium cursor-pointer">
                  Send invite link instead of setting temporary password
                </Label>
              </div>

              {!isInvite && (
                <div className="space-y-1.5">
                  <Label htmlFor="tPass">Temporary Password</Label>
                  <Input
                    id="tPass"
                    placeholder="Min 8 characters"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    User will be forced to change password at next login.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edName">Full Name *</Label>
              <Input
                id="edName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Assigned Role</Label>
              <select
                value={editRoleId}
                disabled={editingUser?.id === currentUser.id}
                onChange={(e) => setEditRoleId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm disabled:opacity-50"
              >
                {roles
                  .filter((r) => currentUser.roleKey === "owner" || r.key !== "owner")
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
              {editingUser?.id === currentUser.id && (
                <p className="text-[11px] text-muted-foreground">
                  You cannot modify your own assigned role.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Result Dialog (Token / Temp Password) */}
      <Dialog open={!!resultDialog} onOpenChange={() => setResultDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{resultDialog?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">{resultDialog?.message}</p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={resultDialog?.copyValue || ""}
                className="font-mono text-xs bg-muted/40"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(resultDialog?.copyValue || "")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setResultDialog(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
