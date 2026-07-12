import { z } from "zod";

import { CHECKER_TYPES, QUESTION_DIFFICULTIES } from "@/modules/questions/constants";

export const testcaseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().max(255, "Name is too long (max 255 characters).").optional().nullable(),
  input: z.string(),
  expectedOutput: z.string(),
  isSample: z.boolean().default(false),
  isHidden: z.boolean().default(true),
  checkerType: z.enum(CHECKER_TYPES).default("exact"),
  floatTolerance: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    return Number(value);
  }, z.number().positive("Float tolerance must be greater than 0.").nullable()).optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export const questionSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(255, "Title is too long (max 255 characters)."),
  description: z.string().min(1, "Description is required."),
  difficulty: z.enum(QUESTION_DIFFICULTIES),
  totalScore: z.coerce.number().positive("Total score must be greater than 0."),
  timeLimitMs: z.coerce.number().int().positive("Time limit must be greater than 0."),
  memoryLimitMb: z.coerce.number().int().positive("Memory limit must be greater than 0."),
  starterCode: z.string().optional().nullable(),
  isPublished: z.boolean().default(false),
  allowedLanguages: z.array(z.string()).optional().nullable(),
});

export const questionWithTestcasesSchema = questionSchema.extend({
  testcases: z.array(testcaseSchema).default([]),
});
