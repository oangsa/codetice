import { z } from "zod";
import { Messages } from "@/lib/api.constants";
import { MAX_SUBMISSION_SOURCE_CHARS } from "@/lib/submission.constants";

export const runSampleSchema = z.object({
  questionId: z.string().uuid("Invalid question."),
  sourceCode: z
    .string()
    .min(1, Messages.codeRequired)
    .max(MAX_SUBMISSION_SOURCE_CHARS, Messages.codeTooLong(MAX_SUBMISSION_SOURCE_CHARS)),
  language: z.string().trim().min(1, Messages.languageRequired).max(50).default("python"),
});

export const submitSchema = runSampleSchema.extend({
  assignmentId: z.string().uuid().optional().nullable(),
});
