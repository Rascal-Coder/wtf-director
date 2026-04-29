import "dotenv/config";

import {
  handleStoryToScriptTask,
  type StoryToScriptJobData,
} from "./handlers/story-to-script";

import { STORY_TO_SCRIPT_RUN, TEXT_QUEUE_NAME } from "./queue";

/**
 * BullMQ worker 入口：`pnpm worker`
 *
 * 仅在配置了 REDIS_URL 时才生效；inline 模式下无需此进程。
 */
async function main() {
  if (!process.env.REDIS_URL) {
    // eslint-disable-next-line no-console
    console.error(
      "[worker] REDIS_URL is not set; inline mode is active and no worker process is needed.",
    );
    process.exit(1);
  }

  const { Worker } = await import("bullmq");
  const Redis = (await import("ioredis")).default;

  const connection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    TEXT_QUEUE_NAME,
    async (job) => {
      if (job.name === STORY_TO_SCRIPT_RUN) {
        const data = job.data as StoryToScriptJobData;
        return handleStoryToScriptTask(data);
      }
      throw new Error(`Unknown job name: ${job.name}`);
    },
    { connection, concurrency: 2 },
  );

  worker.on("ready", () => {
    // eslint-disable-next-line no-console
    console.log(
      `[worker] connected to ${process.env.REDIS_URL}, listening on queue=${TEXT_QUEUE_NAME}`,
    );
  });

  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`[worker] job ${job?.id} failed:`, err);
  });

  const shutdown = async () => {
    // eslint-disable-next-line no-console
    console.log("[worker] shutting down...");
    await worker.close();
    await connection.quit();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[worker] fatal:", e);
  process.exit(1);
});
