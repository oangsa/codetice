import { DEFAULT_GRADING_WORKER_POLL_MS } from "@/lib/grader.constants";
import { closeDb } from "@/lib/db";
import { prepareDockerImage } from "@/server/services/docker-image-service";
import { listSupportedLanguages } from "@/server/services/language-service";
import { cleanupOldRateLimits } from "@/server/services/rate-limit-service";
import { processPendingGradingJobs } from "@/server/services/submission-service";

const DEFAULT_IMAGE_PREP_INTERVAL_MS = 60_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function prepareEnabledLanguageImages() {
  const languages = await listSupportedLanguages();
  const images = [...new Set(languages.map((language) => language.dockerImage.trim()).filter(Boolean))];

  if (images.length === 0) {
    return;
  }

  for (const image of images) {
    try {
      await prepareDockerImage(image);
    } catch (error) {
      console.error(`Docker image preparation failed for '${image}':`, error);
    }
  }
}

async function main() {
  const pollMs = Math.max(250, Number(process.env.GRADING_WORKER_POLL_MS ?? DEFAULT_GRADING_WORKER_POLL_MS));
  const batchSize = Math.max(1, Number(process.env.GRADING_WORKER_BATCH_SIZE ?? 100));
  const runOnce = process.env.GRADING_WORKER_RUN_ONCE === "true";
  const configuredImagePrepIntervalMs = Number(
    process.env.GRADING_IMAGE_PREP_INTERVAL_MS ?? DEFAULT_IMAGE_PREP_INTERVAL_MS,
  );
  const imagePrepIntervalMs = Number.isFinite(configuredImagePrepIntervalMs)
    ? Math.max(10_000, configuredImagePrepIntervalMs)
    : DEFAULT_IMAGE_PREP_INTERVAL_MS;

  let backoff = pollMs;
  let lastCleanup = 0;
  let lastImagePrep = 0;

  do {
    try {
      await processPendingGradingJobs(batchSize);
      backoff = pollMs; // reset backoff on success
    } catch (err) {
      console.error("Grading worker error (will retry):", err);
      // exponential backoff capped at 30s
      backoff = Math.min(backoff * 2, 30_000);
    }

    if (!runOnce && Date.now() - lastImagePrep > imagePrepIntervalMs) {
      try {
        await prepareEnabledLanguageImages();
      } catch (err) {
        console.error("Docker image preparation pass failed:", err);
      }
      lastImagePrep = Date.now();
    }

    if (Date.now() - lastCleanup > 3_600_000) {
      try {
        await cleanupOldRateLimits();
      } catch (err) {
        console.error("Rate limit cleanup error:", err);
      }
      lastCleanup = Date.now();
    }

    if (runOnce) {
      break;
    }

    await sleep(backoff);
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
