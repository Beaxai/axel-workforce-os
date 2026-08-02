import app from "./app";
import { purgeExpiredClassifyCache } from "./lib/aiClassifyCache";
import { sweepDepositMonitors } from "./lib/deposit-monitor";
import { logger } from "./lib/logger";

const CLASSIFY_CACHE_SWEEP_INTERVAL_MS = 60 * 60 * 1000;
const DEPOSIT_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

/** §6E deposit monitor: hourly check for deals past day 21 needing the CSA
 *  confirmation-request task. Idempotent (stamped per deal), so hourly is safe. */
function startDepositSweeper(): void {
  const sweep = async (): Promise<void> => {
    try {
      const { tasksCreated } = await sweepDepositMonitors();
      if (tasksCreated > 0) logger.info({ tasksCreated }, "Deposit monitor: day-21 CSA task(s) created");
    } catch (err) {
      logger.error({ err }, "Deposit monitor sweep failed");
    }
  };

  void sweep();
  const timer = setInterval(() => {
    void sweep();
  }, DEPOSIT_SWEEP_INTERVAL_MS);
  timer.unref();
}

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
  startDepositSweeper();
});
