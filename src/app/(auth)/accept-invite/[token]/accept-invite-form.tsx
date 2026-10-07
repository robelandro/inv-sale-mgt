"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction } from "@/app/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Loader2 } from "lucide-react";

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await acceptInviteAction({ token, password });
      if (!res.success) {
        toast.error(res.error || "Failed to set password");
        setLoading(false);
        return;
      }

      toast.success("Account activated! Redirecting to dashboard...");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input value={email} disabled className="bg-muted/40" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="iPass">Create Password (min 8 chars)</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="iPass"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9"
            autoFocus
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="iConf">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="iConf"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pl-9"
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Activate Account & Sign In
      </Button>
    </form>
  );
}
