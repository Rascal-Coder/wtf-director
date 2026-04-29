import type { PromptLocale } from "@/lib/ai/prompts";
import { prisma } from "@/lib/db/prisma";
import { runStoryToScriptOrchestrator } from "@/lib/workflow/story-to-script/orchestrator";
import type {
  EmitProgress,
  ProgressEvent,
} from "@/lib/workflow/story-to-script/types";
import {
  persistProgress,
  publishRunEvent,
} from "@/lib/workflow/run-progress";
import {
  releaseLease,
  withWorkflowRunLease,
} from "@/lib/workflow/run-lease";

export interface StoryToScriptJobData {
  runId: string;
  episodeId: string;
  locale: PromptLocale;
}

/**
 * 队列消费 / inline 执行 共用的处理器。
 * 把 orchestrator 上报的事件持久化 + 进程内广播。
 */
export async function handleStoryToScriptTask(data: StoryToScriptJobData) {
  const { runId, episodeId, locale } = data;

  const episode = await prisma.novelPromotionEpisode.findUnique({
    where: { id: episodeId },
  });
  if (!episode) {
    throw new Error(`Episode ${episodeId} not found`);
  }

  const emit: EmitProgress = async (event: ProgressEvent) => {
    publishRunEvent(runId, event);
    try {
      await persistProgress(runId, event);
    } catch {
      // 持久化失败不阻塞流程
    }
  };

  try {
    await prisma.novelPromotionEpisode.update({
      where: { id: episodeId },
      data: { status: "running" },
    });

    const result = await withWorkflowRunLease(runId, () =>
      runStoryToScriptOrchestrator(
        {
          runId,
          episodeId,
          rawText: episode.rawText,
          locale,
        },
        emit,
      ),
    );

    await emit({ type: "done", result });
    await releaseLease(runId, "done");
    await prisma.novelPromotionEpisode.update({
      where: { id: episodeId },
      data: { status: "done" },
    });
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await emit({ type: "error", message });
    try {
      await releaseLease(runId, "failed");
    } catch {
      // ignore
    }
    await prisma.novelPromotionEpisode.update({
      where: { id: episodeId },
      data: { status: "failed" },
    });
    throw e;
  }
}
