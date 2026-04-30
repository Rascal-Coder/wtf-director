/**
 * LLM 流式输出的核心层。
 *
 * 通过 AsyncLocalStorage 把"当前正在监听哪个 substep 的 chunk 回调"
 * 透明地穿透整个调用栈，不需要在每一层手动传递 onDelta。
 *
 * 使用方式（在 orchestrator / worker 层）：
 *   await runWithLLMStreamCallbacks(callbacks, () => someDeepLLMCall())
 *
 * LLM 层（openai-compatible.ts）只需调用：
 *   await emitStreamChunk('text', delta)
 *   await emitStreamChunk('reasoning', delta)
 */

import { AsyncLocalStorage } from "node:async_hooks";

// ─── 类型 ────────────────────────────────────────────────

export interface StreamChunk {
  /** 'reasoning' = 思考 token；'text' = 最终输出 token */
  kind: "reasoning" | "text";
  delta: string;
}

export interface LLMStreamCallbacks {
  onChunk: (chunk: StreamChunk) => void | Promise<void>;
  signal?: AbortSignal;
}

// ─── AsyncLocalStorage 单例 ──────────────────────────────

const _storage = new AsyncLocalStorage<LLMStreamCallbacks>();

/** 获取当前 async 调用栈绑定的 LLM 流式回调（无则返回 undefined） */
export function getInternalLLMStreamCallbacks(): LLMStreamCallbacks | undefined {
  return _storage.getStore();
}

/**
 * 在 `fn()` 的整个调用栈里绑定 `callbacks`。
 * 所有通过 `emitStreamChunk` 发出的 chunk 都会路由到这里。
 */
export function runWithLLMStreamCallbacks<T>(
  callbacks: LLMStreamCallbacks,
  fn: () => Promise<T>,
): Promise<T> {
  return _storage.run(callbacks, fn);
}

// ─── 发射口 ──────────────────────────────────────────────

/**
 * 由 LLM 底层（openai-compatible.ts）调用。
 * 如果当前 async 栈里有 callbacks，就把 chunk 路由过去；否则静默忽略。
 */
export async function emitStreamChunk(
  kind: "reasoning" | "text",
  delta: string,
): Promise<void> {
  if (!delta) return;
  const callbacks = getInternalLLMStreamCallbacks();
  if (!callbacks) return;
  if (callbacks.signal?.aborted) return;

  try {
    await callbacks.onChunk({ kind, delta });
  } catch {
    // 回调异常不阻断 LLM 流
  }
}
