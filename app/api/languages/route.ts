import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { supportedLanguageSchema } from "@/lib/validations/language";
import {
  createUniqueSupportedLanguageSlug,
  createSupportedLanguage,
  listAllSupportedLanguages,
  listSupportedLanguages,
} from "@/server/services/language-service";
import { prepareDockerImage } from "@/server/services/docker-image-service";

export const runtime = "nodejs";

function formatLanguageValidationError(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  const fieldErrors = error.flatten().fieldErrors;
  const firstError = Object.entries(fieldErrors).find(([, messages]) => messages.length > 0);

  if (!firstError) {
    return "Invalid language payload.";
  }

  const [field, messages] = firstError;
  return `${field}: ${messages[0]}`;
}

export async function GET() {
  const languages = await listSupportedLanguages();
  return ok({ languages });
}

export async function POST(request: Request) {
  await requireAdmin();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON payload.", 400);
  }
  const parsed = supportedLanguageSchema.safeParse(body);

  if (!parsed.success) {
    return fail(formatLanguageValidationError(parsed.error), 400, { errors: parsed.error.flatten() });
  }

  try {
    const slug = await createUniqueSupportedLanguageSlug(parsed.data.name);
    await prepareDockerImage(parsed.data.dockerImage);
    const language = await createSupportedLanguage({ ...parsed.data, slug });
    const languages = await listAllSupportedLanguages();
    return ok({ language, languages }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to create language.", 400);
  }
}
