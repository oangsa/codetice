import { z } from "zod";
import { MAX_SUBMISSION_SOURCE_CHARS } from "@/lib/constants";

export const runSampleSchema = z.object({
  questionId: z.string().uuid(),
  sourceCode: z.string().min(1).max(MAX_SUBMISSION_SOURCE_CHARS),
  language: z.string().trim().min(1).max(50).default("python"),
});

export const submitSchema = runSampleSchema.extend({
  assignmentId: z.string().uuid().optional().nullable(),
});
