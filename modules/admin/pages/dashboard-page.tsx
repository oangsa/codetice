import Link from "next/link";
import { BookOpen, Languages, Users } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageAdmin } from "@/lib/auth";

const destinations = [
  { href: "/workspaces", label: "Workspaces", description: "Manage workspace lifecycle and content.", icon: BookOpen },
  { href: "/admin/users", label: "Users", description: "Manage platform accounts and roles.", icon: Users },
  { href: "/admin/languages", label: "Languages", description: "Manage and verify grading runtimes.", icon: Languages },
];

export default async function AdminDashboardPage() {
  await requirePageAdmin();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title="Control Room" description="Manage workspaces, users, and grading runtimes." />
      <div className="grid gap-4 md:grid-cols-3">
        {destinations.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="h-full rounded-[30px] transition-colors hover:bg-muted/50">
              <CardHeader><Icon className="h-5 w-5" /><CardTitle>{label}</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
