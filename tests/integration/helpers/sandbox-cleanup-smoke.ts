import { closeDb } from "@/lib/db";
import { cleanupExpiredSandboxJobs } from "@/server/grading/sandbox-jobs";
import { processPendingSandboxJobs } from "@/server/grading/sandbox-worker";

try {
  const processed = await processPendingSandboxJobs(1, "sandbox-cleanup-smoke");
  await cleanupExpiredSandboxJobs();
  process.stdout.write(JSON.stringify({ processed }));
} finally {
  await closeDb();
}
