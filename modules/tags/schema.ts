import { z } from "zod";

export const workspaceTagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required.").max(100, "Tag name is too long (max 100 characters)."),
});
