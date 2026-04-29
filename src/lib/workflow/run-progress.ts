import { prisma } from "@/lib/db/prisma";

import type { ProgressEvent } from "./story-to-script/types";

/**
 * 进度总线：
 *  - 把 orchestrator 上报的 progress / log 事件落到 WorkflowRun 表（用于断线后从 DB 拉取）。
 *  - 同时通过进程内 EventEmitter 转发，给 SSE endpoint 实时订阅。
 */

import { EventEmitter } from "node:events";

const bus = new EventEmitter();
bus.setMaxListeners(0);

function channel(runId: string) {
  return `run:${runId}`;
}

export function subscribeRun(
  runId: string,
  listener: (event: ProgressEvent) => void,
): () => void {
  bus.on(channel(runId), listener);
  return () => bus.off(channel(runId), listener);
}

export function publishRunEvent(runId: string, event: ProgressEvent) {
  bus.emit(channel(runId), event);
}

export async function persistProgress(runId: string, event: ProgressEvent) {
  if (event.type === "progress") {
    await prisma.workflowRun.update({
      where: { id: runId },
      data: { progress: event.progress, step: event.step },
    });
  } else if (event.type === "step.done") {
    await prisma.workflowRun.update({
      where: { id: runId },
      data: { step: event.step },
    });
  } else if (event.type === "done") {
    await prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: "done",
        progress: 100,
        result: JSON.stringify(event.result),
      },
    });
  } else if (event.type === "error") {
    await prisma.workflowRun.update({
      where: { id: runId },
      data: { status: "failed", error: event.message },
    });
  }
}
