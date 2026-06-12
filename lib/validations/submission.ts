import { z } from "zod";

export const runSampleSchema = z.object({
  questionId: z.string().uuid(),
  sourceCode: z.string().min(1),
  language: z.string().trim().min(1).max(50).default("python"),
});

export const submitSchema = runSampleSchema.extend({
  assignmentId: z.string().uuid().optional().nullable(),
});
