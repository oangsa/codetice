import { requireAdmin } from "@/lib/auth";
import { listAllUsers } from "@/server/services/auth-service";
import { UserManager, type AdminUserRow } from "@/components/admin/user-manager";
import { MetricCard } from "@/components/commons/metric-card";
import { PageHeader } from "@/components/commons/page-header";
import { Shield, Users } from "lucide-react";

export const metadata = {
  title: "Manage Users - Admin | Codetice",
  description: "View and manage all registered users.",
};

export default async function AdminUsersPage() {
  const session = await requireAdmin();
  const users = await listAllUsers();
  const rows = users.map((user) => ({
    ...user,
    role: user.role === "admin" ? "admin" : "student",
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
        <MetricCard label="Total users" value={rows.length} hint="Local accounts" icon={<Users className="h-4 w-4" />} />
        <MetricCard label="Admins" value={adminCount} hint="Can manage platform records" icon={<Shield className="h-4 w-4" />} />
        <MetricCard label="Students" value={rows.length - adminCount} hint="Can solve assigned questions" icon={<Users className="h-4 w-4" />} />
      </div>

      <UserManager users={rows} currentUserId={session.userId} />
    </div>
  );
}
