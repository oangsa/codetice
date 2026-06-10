import { z } from "zod";

import { SUPPORTED_LANGUAGE_SLUGS } from "@/lib/constants";

export const runSampleSchema = z.object({
  questionId: z.string().uuid(),
  sourceCode: z.string().min(1),
  language: z.enum(SUPPORTED_LANGUAGE_SLUGS).default("python"),
});

export const submitSchema = runSampleSchema.extend({
  assignmentId: z.string().uuid().optional().nullable(),
});
