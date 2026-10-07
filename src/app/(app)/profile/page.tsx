import { requireAuth } from "@/lib/auth";
import { ProfileView } from "./profile-view";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { changePassword?: string };
}) {
  const user = await requireAuth();

  return (
    <div className="space-y-6 max-w-2xl">
      <ProfileView
        user={user}
        forcedPasswordChange={searchParams.changePassword === "true" || user.mustChangePassword}
      />
    </div>
  );
}
