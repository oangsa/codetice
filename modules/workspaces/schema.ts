import { z } from "zod";

export const workspaceSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required.").max(255, "Name is too long (max 255 characters)."),
});

export const workspaceOwnerSchema = z.object({
  ownerId: z.string().uuid(),
});

export const joinWorkspaceSchema = z.object({
  inviteCode: z.string().trim().min(3, "Invite code must be at least 3 characters.").max(50),
});

export const workspaceCloneSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required.").max(255, "Name is too long (max 255 characters)."),
  questions: z.array(z.object({
    questionId: z.string().uuid(),
    include: z.boolean().default(false),
    isPublished: z.boolean().default(false),
  })).max(1000).refine(
    (questions) => new Set(questions.map((question) => question.questionId)).size === questions.length,
    "Questions must be unique.",
  ),
});
