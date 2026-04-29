/**
 * 队列抽象层。
 *
 * - 当 REDIS_URL 已配置：使用 BullMQ + ioredis（worker 需独立进程跑 `pnpm worker`）。
 * - 否则：inline 模式，把任务直接在当前 Node 进程的微任务里跑（适合本地开发 / Vercel Serverless）。
 *
 * 任意地方仅需调用 `enqueueStoryToScriptRun`，不必关心具体引擎。
 */

import {
  handleStoryToScriptTask,
  type StoryToScriptJobData,
} from "./handlers/story-to-script";

export const TEXT_QUEUE_NAME = "text";
export const STORY_TO_SCRIPT_RUN = "story_to_script_run";

interface BullMQModules {
  Queue: typeof import("bullmq").Queue;
  Worker: typeof import("bullmq").Worker;
  Redis: typeof import("ioredis").default;
}

let bullPromise: Promise<{
  queue: import("bullmq").Queue;
  modules: BullMQModules;
} | null> | null = null;

async function getBullQueue() {
  if (!process.env.REDIS_URL) return null;
  if (!bullPromise) {
    bullPromise = (async () => {
      try {
        const [{ Queue }, ioredisModule] = await Promise.all([
          import("bullmq"),
          import("ioredis"),
        ]);
        const Redis = ioredisModule.default;
        const Worker = (await import("bullmq")).Worker;
        const connection = new Redis(process.env.REDIS_URL!, {
          maxRetriesPerRequest: null,
        });
        const queue = new Queue(TEXT_QUEUE_NAME, { connection });
        return {
          queue,
          modules: { Queue, Worker, Redis },
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(
          "[queue] BullMQ not available, falling back to inline mode:",
          e,
        );
        return null;
      }
    })();
  }
  return bullPromise;
}

export interface EnqueueOptions {
  /** 去重 key：相同 key 在队列里只会保留一份。 */
  dedupeKey?: string;
}

export async function enqueueStoryToScriptRun(
  data: StoryToScriptJobData,
  options: EnqueueOptions = {},
): Promise<{ mode: "bullmq" | "inline" }> {
  const bull = await getBullQueue();
  if (bull) {
    await bull.queue.add(STORY_TO_SCRIPT_RUN, data, {
      jobId: options.dedupeKey,
      removeOnComplete: 100,
      removeOnFail: 100,
    });
    return { mode: "bullmq" };
  }

  // inline：放进微任务，立即返回。错误已经在 handler 里被 emit 出去并标记失败。
  setImmediate(() => {
    handleStoryToScriptTask(data).catch((e) => {
      // eslint-disable-next-line no-console
      console.error("[inline-worker] story_to_script_run failed:", e);
    });
  });
  return { mode: "inline" };
}
