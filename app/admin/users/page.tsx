import { requireAdmin } from "@/lib/auth";
import { listAllUsers } from "@/server/services/auth-service";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GenerateResetLinkDialog } from "@/components/admin/generate-reset-link-dialog";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";
import { Shield, Users } from "lucide-react";

export const metadata = {
  title: "Manage Users - Admin | Codetice",
  description: "View and manage all registered users.",
};

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await listAllUsers();

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} registered user{users.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-base">All Users</CardTitle>
          <CardDescription>
            Manage user accounts and reset passwords when needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="w-[260px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {user.role === "admin" ? (
                          <Shield className="h-3.5 w-3.5 text-amber-500" />
                        ) : null}
                        {user.username}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <GenerateResetLinkDialog userId={user.id} username={user.username} />
                        <ResetPasswordDialog userId={user.id} username={user.username} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
