import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Settings } from "lucide-react";

export const metadata = {
  title: "Settings | Codetice",
  description: "Manage your account settings.",
};

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account preferences
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Change Password</CardTitle>
          </div>
          <CardDescription>
            Update your password. You will need to enter your current password to confirm the
            change.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
