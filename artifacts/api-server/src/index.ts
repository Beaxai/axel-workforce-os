import app from "./app";
import { purgeExpiredClassifyCache } from "./lib/aiClassifyCache";
import { logger } from "./lib/logger";

const CLASSIFY_CACHE_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

function startClassifyCacheSweeper(): void {
  const sweep = async (): Promise<void> => {
    try {
      await purgeExpiredClassifyCache();
      logger.debug("Purged expired ai_classify_cache rows");
    } catch (err) {
      logger.error({ err }, "Failed to purge expired ai_classify_cache rows");
    }
  };

  void sweep();
  const timer = setInterval(() => {
    void sweep();
  }, CLASSIFY_CACHE_SWEEP_INTERVAL_MS);
  timer.unref();
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startClassifyCacheSweeper();
});
