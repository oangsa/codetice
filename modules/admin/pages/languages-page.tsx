import { LanguageManager, type Language } from "@/modules/admin/components/language-manager";
import { PageHeader } from "@/components/common/page-header";
import { SurfaceCard } from "@/components/common/surface-card";
import { requirePageAdmin } from "@/lib/auth";
import { listAdminLanguagesPage } from "@/server/languages/service";

export const metadata = {
  title: "Language Runtimes – Admin",
};

export default async function AdminLanguagesPage() {
  await requirePageAdmin();
  const page = await listAdminLanguagesPage({ pageNumber: 1, pageSize: 10 });
  const languages = page.items as Language[];

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
        <LanguageManager initialPage={{ items: languages, meta: page.meta }} />
      </SurfaceCard>
    </div>
  );
}
