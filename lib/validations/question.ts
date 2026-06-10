import { z } from "zod";

import { CHECKER_TYPES, QUESTION_DIFFICULTIES } from "@/lib/constants";

export const testcaseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().max(255).optional().nullable(),
  input: z.string().min(1),
  expectedOutput: z.string(),
  isSample: z.boolean().default(false),
  isHidden: z.boolean().default(true),
  checkerType: z.enum(CHECKER_TYPES).default("exact"),
  floatTolerance: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    return Number(value);
  }, z.number().positive().nullable()).optional(),
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
