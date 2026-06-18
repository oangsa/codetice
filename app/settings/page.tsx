import { requireCurrentUser } from "@/lib/auth";
import { SettingsContainer } from "@/components/settings/settings-container";

export const metadata = {
  title: "Settings | Codetice",
  description: "Manage your account settings.",
};

export default async function SettingsPage() {
  const session = await requireCurrentUser();
  return <SettingsContainer session={session} />;
}
