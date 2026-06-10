import { clearUserSession } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function POST() {
  await clearUserSession();
  return ok({ success: true });
}
