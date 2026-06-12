import { z } from "zod";
import { SUPPORTED_LANGUAGE_SLUGS } from "@/lib/constants";

export const supportedLanguageSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[a-z][a-z0-9_-]*$/, "Slug must be lowercase alphanumeric with hyphens/underscores")
    .refine((value) => SUPPORTED_LANGUAGE_SLUGS.includes(value as (typeof SUPPORTED_LANGUAGE_SLUGS)[number]), {
      message: `Slug must be one of: ${SUPPORTED_LANGUAGE_SLUGS.join(", ")}.`,
    }),
  dockerImage: z.string().trim().min(1).max(255),
  fileExtension: z.string().trim().min(1).max(20).regex(/^[a-z0-9]+$/, "File extension must be alphanumeric."),
  runCommand: z.string().trim().min(1).max(100),
  defaultStarterCode: z.string().optional().nullable(),
  isEnabled: z.boolean().default(true),
});

export const updateSupportedLanguageSchema = supportedLanguageSchema.omit({ slug: true });
