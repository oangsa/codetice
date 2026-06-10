import { z } from "zod";

import { QUESTION_DIFFICULTIES } from "@/lib/constants";

export const testcaseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().max(255).optional().nullable(),
  input: z.string().min(1),
  expectedOutput: z.string(),
  isSample: z.boolean().default(false),
  isHidden: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export const questionSchema = z.object({
  title: z.string().trim().min(1).max(255),
  slug: z.string().trim().min(1).max(255),
  description: z.string().min(1),
  difficulty: z.enum(QUESTION_DIFFICULTIES),
  totalScore: z.coerce.number().positive(),
  timeLimitMs: z.coerce.number().int().positive(),
  memoryLimitMb: z.coerce.number().int().positive(),
  starterCode: z.string().optional().nullable(),
  isPublished: z.boolean().default(false),
});

export const questionWithTestcasesSchema = questionSchema.extend({
  testcases: z.array(testcaseSchema).default([]),
});
