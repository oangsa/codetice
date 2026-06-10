import { z } from "zod";

export const classroomSchema = z.object({
  name: z.string().trim().min(1).max(255),
});

export const joinClassroomSchema = z.object({
  inviteCode: z.string().trim().min(3).max(50),
});

export const assignmentSchema = z.object({
  classroomId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().optional().nullable(),
  startAt: z.string().trim().optional().nullable(),
  dueAt: z.string().trim().optional().nullable(),
  questionIds: z.array(z.string().uuid()).min(1),
});
