import { z } from "zod";

export const workspaceSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required.").max(255, "Name is too long (max 255 characters)."),
});

export const joinWorkspaceSchema = z.object({
  inviteCode: z.string().trim().min(3, "Invite code must be at least 3 characters.").max(50),
});
