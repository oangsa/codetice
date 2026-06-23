import { z } from "zod";

export const classroomSchema = z.object({
  name: z.string().trim().min(1, "Classroom name is required.").max(255, "Name is too long (max 255 characters)."),
});

export const joinClassroomSchema = z.object({
  inviteCode: z.string().trim().min(3, "Invite code must be at least 3 characters.").max(50),
});

export const assignmentSchema = z.object({
  classroomId: z.string().uuid(),
  title: z.string().trim().min(1, "Assignment title is required.").max(255, "Title is too long (max 255 characters)."),
  description: z.string().trim().optional().nullable(),
  startAt: z.string().trim().optional().nullable(),
  dueAt: z.string().trim().optional().nullable(),
  questionIds: z.array(z.string().uuid()).min(1, "Select at least one question."),
});
