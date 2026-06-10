import { LanguageSettingsForm } from "@/components/admin/language-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { listAllSupportedLanguages } from "@/server/services/language-service";

export default async function AdminLanguagesPage() {
  await requireAdmin();
  const languages = await listAllSupportedLanguages();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Language runtime settings</CardTitle>
        <CardDescription>Enable languages and control their runner metadata.</CardDescription>
      </CardHeader>
      <CardContent>
        <LanguageSettingsForm languages={languages} />
      </CardContent>
    </Card>
  );
}
