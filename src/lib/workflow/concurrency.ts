import pLimit from "p-limit";

/**
 * 把一组 items 用受限并发跑过 mapper。结果顺序与输入一致。
 * 任意一项失败会让整体 reject（与 Promise.all 一致）。
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = pLimit(Math.max(1, concurrency));
  return Promise.all(items.map((item, i) => limit(() => mapper(item, i))));
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  onRetry?: (error: unknown, attempt: number) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 600;

  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i >= attempts) break;
      options.onRetry?.(e, i);
      await new Promise((r) => setTimeout(r, baseDelayMs * i));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}
