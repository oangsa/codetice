import { UserManager, type AdminUserRow } from "@/modules/admin/components/user-manager";
import { PageHeader } from "@/components/common/page-header";
import { requirePageAdmin } from "@/lib/auth";
import { listUsersPage } from "@/server/auth/service";

export const metadata = {
  title: "Manage Users - Admin | Codetice",
  description: "View and manage all registered users.",
};

export default async function AdminUsersPage() {
  const session = await requirePageAdmin();
  const page = await listUsersPage({ pageNumber: 1, pageSize: 10 });
  const rows = page.items.map((user) => ({
    ...user,
    role: user.role === "admin" ? "admin" as const : "student" as const,
    createdAt: user.createdAt.toISOString(),
  })) satisfies AdminUserRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Create accounts, manage roles, reset access, and remove local users from one operational workspace."
      />

      <UserManager
        initialPage={{ items: rows, meta: page.meta }}
        currentUserId={session.userId}
      />
    </div>
  );
}
