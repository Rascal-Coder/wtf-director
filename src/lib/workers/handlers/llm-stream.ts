/**
 * Worker 层的 LLM stream callbacks 工厂。
 *
 * 功能：
 *   1. 通过顺序队列保证 SSE 事件按序到达前端（parallel 并发下尤其重要）
 *   2. 检查 signal.aborted，提前中止后续 emit
 */

import type { LLMStreamCallbacks, StreamChunk } from "@/lib/llm/chat-stream";
import type { EmitProgress } from "@/lib/workflow/story-to-script/types";

export interface WorkerLLMStreamCallbacksOptions {
  substep: string;
  emit: EmitProgress;
  signal?: AbortSignal;
}

/**
 * 创建一组 LLMStreamCallbacks，供 runWithLLMStreamCallbacks 使用。
 *
 * 特性：
 * - 顺序队列：把所有 emit 串行化，确保 SSE chunk 有序
 * - 提前取消：signal abort 后跳过剩余队列
 */
export interface WorkerLLMStreamCallbacks extends LLMStreamCallbacks {
  /** 等待顺序队列完全清空（在 stream.end 之前调用） */
  drain: () => Promise<void>;
}

export function createWorkerLLMStreamCallbacks(
  opts: WorkerLLMStreamCallbacksOptions,
): WorkerLLMStreamCallbacks {
  const { substep, emit, signal } = opts;

  // 顺序队列：所有 emit 都串在这条 Promise 链上
  let queue: Promise<void> = Promise.resolve();

  const onChunk = (chunk: StreamChunk): void => {
    if (signal?.aborted) return;
    if (!chunk.delta) return;

    const captured = chunk.delta;
    const kind = chunk.kind;
    queue = queue.then(async () => {
      if (signal?.aborted) return;
      await emit({
        type: "stream.delta",
        substep,
        kind,
        delta: captured,
      });
    });
  };

  const drain = () => queue;

  return { onChunk, drain, signal };
}
