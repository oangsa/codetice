import { closeDb } from "@/lib/db";
import { processPendingGradingJobs } from "@/server/services/submission-service";

async function main() {
  const count = await processPendingGradingJobs(100);
  console.log(`Processed ${count} grading job(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
