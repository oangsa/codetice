import { z } from "zod";

import { ok, toFailResponse, Messages } from "@/lib/api";
import { requireApiAdmin } from "@/lib/auth";
import { updateSupportedLanguageSchema } from "@/modules/admin/language-schema";
import { deleteSupportedLanguage, updateSupportedLanguage } from "@/server/languages/service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAdmin();
    const { id } = await context.params;
    const body = updateSupportedLanguageSchema.parse(await request.json());
    return ok({ language: await updateSupportedLanguage(id, body) });
  } catch (error) {
    return toFailResponse(error, error instanceof z.ZodError ? Messages.invalidRequest : Messages.unableToUpdateLanguage);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAdmin();
    const { id } = await context.params;
    await deleteSupportedLanguage(id);
    return ok({ message: "Language deleted." });
  } catch (error) {
    return toFailResponse(error, Messages.unableToDeleteLanguage);
  }
}
