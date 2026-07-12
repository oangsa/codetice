import { Shield, Users } from "lucide-react";

import { UserManager, type AdminUserRow } from "@/modules/admin/components/user-manager";
import { MetricCard } from "@/components/common/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { requirePageAdmin } from "@/lib/auth";
import { listUsersPage } from "@/server/auth/service";

export const metadata = {
  title: "Manage Users - Admin | Codetice",
  description: "View and manage all registered users.",
};

export default async function AdminUsersPage() {
  const session = await requirePageAdmin();
  const page = await listUsersPage({ limit: 10, cursor: null });
  const rows = page.items.map((user) => ({
    ...user,
    role: user.role === "admin" ? "admin" as const : "student" as const,
    createdAt: user.createdAt.toISOString(),
  })) satisfies AdminUserRow[];
  const adminCount = rows.filter((user) => user.role === "admin").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Create accounts, manage roles, reset access, and remove local users from one operational workspace."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Users on this page" value={rows.length} hint="Cursor-paginated accounts" icon={<Users className="h-4 w-4" />} />
        <MetricCard label="Admins on this page" value={adminCount} hint="Can manage platform records" icon={<Shield className="h-4 w-4" />} />
        <MetricCard label="Students on this page" value={rows.length - adminCount} hint="Can solve workspace questions" icon={<Users className="h-4 w-4" />} />
      </div>

      <UserManager
        initialPage={{ ...page, items: rows }}
        currentUserId={session.userId}
      />
    </div>
  );
}
