import { z } from "zod";

export const supportedLanguageSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[a-z][a-z0-9_-]*$/, "Slug must be lowercase alphanumeric with hyphens/underscores"),
  dockerImage: z.string().trim().min(1),
  fileExtension: z.string().trim().min(1).max(20),
  runCommand: z.string().trim().min(1),
  defaultStarterCode: z.string().optional().nullable(),
  isEnabled: z.boolean().default(true),
});

export const updateSupportedLanguageSchema = supportedLanguageSchema.omit({ slug: true });
