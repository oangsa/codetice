import crypto from "node:crypto";
import path from "node:path";

import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const BUCKET = "avatars";

export async function POST(request: Request) {
  try {
    const session = await requireUser();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return fail("Storage is not configured on the server.", 500);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return fail("No file uploaded.");
    }

    if (!file.type.startsWith("image/")) {
      return fail("Only image files are allowed.");
    }

    if (file.size > 5 * 1024 * 1024) {
      return fail("Maximum file size is 5MB.");
    }

    const ext = path.extname(file.name) || ".png";
    const filename = `${session.userId}/${crypto.randomUUID()}${ext}`;

    // Upload to Supabase Storage via REST API (no SDK required)
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`;
    const bytes = await file.arrayBuffer();

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": file.type,
        "x-upsert": "true",
      },
      body: bytes,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error("Supabase Storage upload failed:", err);
      return fail("Failed to upload avatar. Please try again.", 500);
    }

    // Build the public URL (bucket must be set to public in Supabase dashboard)
    const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
    return ok({ url: avatarUrl });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to upload avatar.", 400);
  }
}
