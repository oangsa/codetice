import { DEFAULT_GRADING_WORKER_POLL_MS } from "@/lib/constants";
import { closeDb } from "@/lib/db";
import { processPendingGradingJobs } from "@/server/services/submission-service";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const pollMs = Math.max(250, Number(process.env.GRADING_WORKER_POLL_MS ?? DEFAULT_GRADING_WORKER_POLL_MS));
  const batchSize = Math.max(1, Number(process.env.GRADING_WORKER_BATCH_SIZE ?? 100));
  const runOnce = process.env.GRADING_WORKER_RUN_ONCE === "true";

  do {
    const count = await processPendingGradingJobs(batchSize);
    console.log(`Processed ${count} grading job(s).`);

    if (runOnce) {
      break;
    }

    await sleep(pollMs);
  } while (true);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
