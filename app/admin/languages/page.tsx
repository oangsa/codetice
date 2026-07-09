import { LanguageManager, type Language } from "@/components/admin/language-manager";
import { PageHeader } from "@/components/commons/page-header";
import { SurfaceCard } from "@/components/commons/surface-card";
import { requireAdmin } from "@/lib/auth";
import { listAllSupportedLanguages } from "@/server/services/language-service";

export const metadata = {
  title: "Language Runtimes – Admin",
};

export default async function AdminLanguagesPage() {
  await requireAdmin();
  const languages = (await listAllSupportedLanguages()) as Language[];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Language Runtimes"
        description="Add, configure, and disable the programming languages available to students."
      />

      <SurfaceCard
        title="Configured languages"
        description="Each language maps to a Docker image, optional build command, and testcase run command used in the grading sandbox."
      >
        <LanguageManager languages={languages} />
      </SurfaceCard>
    </div>
  );
}
