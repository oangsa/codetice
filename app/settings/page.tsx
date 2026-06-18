import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SettingsContainer } from "@/components/settings/settings-container";

export const metadata = {
  title: "Settings | Codetice",
  description: "Manage your account settings.",
};

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return <SettingsContainer session={session} />;
}
