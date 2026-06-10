import { z } from "zod";

export const runSampleSchema = z.object({
  questionId: z.string().uuid(),
  sourceCode: z.string().min(1),
});

export const submitSchema = runSampleSchema.extend({
  language: z.literal("python").default("python"),
});
