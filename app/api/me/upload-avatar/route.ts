import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export async function POST(request: Request) {
  try {
    const session = await requireUser();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return fail("No file uploaded.");
    }

    // Validate file type (must be image)
    if (!file.type.startsWith("image/")) {
      return fail("Only image files are allowed.");
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return fail("Maximum file size is 5MB.");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads folder inside public if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate unique name
    const ext = path.extname(file.name) || ".png";
    const filename = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.writeFile(filePath, new Uint8Array(buffer));

    // Return the public URL path
    const avatarUrl = `/uploads/${filename}`;
    return ok({ url: avatarUrl });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to upload avatar.", 400);
  }
}
