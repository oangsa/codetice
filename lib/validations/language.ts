import { z } from "zod";

import { SUPPORTED_LANGUAGE_SLUGS } from "@/lib/constants";

export const supportedLanguageSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.enum(SUPPORTED_LANGUAGE_SLUGS),
  dockerImage: z.string().trim().min(1),
  fileExtension: z.string().trim().min(1).max(20),
  runCommand: z.string().trim().min(1),
  defaultStarterCode: z.string().optional().nullable(),
  isEnabled: z.boolean().default(true),
});
