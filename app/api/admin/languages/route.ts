import { requireAdmin } from "@/lib/auth";
import { ok } from "@/lib/api";
import { listAllSupportedLanguages } from "@/server/services/language-service";

export async function GET() {
  await requireAdmin();
  const languages = await listAllSupportedLanguages();
  return ok({ languages });
}
