import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getUsers, getRoles } from "@/services/users.service";
import { UsersView } from "./users-view";

export default async function UsersPage() {
  const currentUser = await requirePermission(PERMISSIONS.USERS_MANAGE);
  const usersList = await getUsers();
  const rolesList = await getRoles();

  return (
    <div className="space-y-6">
      <UsersView
        users={usersList}
        roles={rolesList}
        currentUser={currentUser}
      />
    </div>
  );
}
