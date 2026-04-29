import { nanoid } from "nanoid";
import { NextRequest } from "next/server";

import { normalizeLocale } from "@/lib/ai/prompts";
import { prisma } from "@/lib/db/prisma";
import { enqueueStoryToScriptRun } from "@/lib/workers/queue";
import {
  publishRunEvent,
  subscribeRun,
} from "@/lib/workflow/run-progress";
import type { ProgressEvent } from "@/lib/workflow/story-to-script/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StreamBody {
  locale?: string;
}

function sseChunk(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as StreamBody;
  const locale = normalizeLocale(body.locale);

  const project = await prisma.novelPromotionProject.findUnique({
    where: { id: projectId },
    include: { episodes: { orderBy: { index: "asc" }, take: 1 } },
  });

  if (!project || !project.episodes[0]) {
    return new Response(
      JSON.stringify({ error: "NOT_FOUND", message: "project or episode not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return new Response(
      JSON.stringify({
        error: "MISSING_CONFIG",
        message: "OPENAI_API_KEY is not configured",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const episode = project.episodes[0];

  // 是否已有进行中的 run？有就直接订阅，避免重复入队
  const existing = await prisma.workflowRun.findFirst({
    where: {
      episodeId: episode.id,
      type: "story_to_script_run",
      status: { in: ["queued", "running"] },
    },
    orderBy: { createdAt: "desc" },
  });

  let runId: string;
  let mode: "bullmq" | "inline" = "inline";

  if (existing) {
    runId = existing.id;
  } else {
    runId = nanoid();
    await prisma.workflowRun.create({
      data: {
        id: runId,
        episodeId: episode.id,
        type: "story_to_script_run",
        status: "queued",
        progress: 0,
      },
    });

    const enqueueResult = await enqueueStoryToScriptRun(
      { runId, episodeId: episode.id, locale },
      { dedupeKey: `story_to_script_run:${episode.id}` },
    );
    mode = enqueueResult.mode;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      safeEnqueue(
        sseChunk("ready", { runId, mode, episodeId: episode.id }),
      );

      const unsubscribe = subscribeRun(runId, (event: ProgressEvent) => {
        safeEnqueue(sseChunk(event.type, event));
        if (event.type === "done" || event.type === "error") {
          closed = true;
          unsubscribe();
          try {
            controller.close();
          } catch {
            // ignore
          }
        }
      });

      // 发布一次"已订阅"事件，触发心跳；如果已经有 run 在跑，把当前进度补给客户端
      void (async () => {
        const fresh = await prisma.workflowRun.findUnique({
          where: { id: runId },
        });
        if (fresh) {
          publishRunEvent(runId, {
            type: "progress",
            progress: fresh.progress,
            step: fresh.step ?? "queued",
            message: "subscribed",
          });
          if (fresh.status === "done") {
            publishRunEvent(runId, {
              type: "done",
              result: fresh.result
                ? (JSON.parse(fresh.result) as {
                    episodeId: string;
                    runId: string;
                    clipCount: number;
                    screenplaySuccessCount: number;
                  })
                : {
                    episodeId: episode.id,
                    runId,
                    clipCount: 0,
                    screenplaySuccessCount: 0,
                  },
            });
          } else if (fresh.status === "failed") {
            publishRunEvent(runId, {
              type: "error",
              message: fresh.error ?? "Unknown error",
            });
          }
        }
      })();

      // 心跳，避免代理切断
      const heartbeat = setInterval(() => {
        safeEnqueue(`: ping ${Date.now()}\n\n`);
      }, 15000);

      const onAbort = () => {
        clearInterval(heartbeat);
        unsubscribe();
        closed = true;
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      request.signal.addEventListener("abort", onAbort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
