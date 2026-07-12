import { LanguageManager, type Language } from "@/modules/admin/components/language-manager";
import { PageHeader } from "@/components/common/page-header";
import { SurfaceCard } from "@/components/common/surface-card";
import { requirePageAdmin } from "@/lib/auth";
import { listAdminLanguagesPage } from "@/server/languages/service";
import Link from "next/link";

export const metadata = {
  title: "Language Runtimes – Admin",
};

export default async function AdminLanguagesPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  await requirePageAdmin();
  const query = await searchParams;
  const page = await listAdminLanguagesPage({ limit: 25, cursor: query.cursor ?? null });
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
        <LanguageManager languages={languages} />
      </SurfaceCard>
      {page.nextCursor ? <Link className="text-sm underline" href={`/admin/languages?cursor=${encodeURIComponent(page.nextCursor)}`}>Next page</Link> : null}
    </div>
  );
}
