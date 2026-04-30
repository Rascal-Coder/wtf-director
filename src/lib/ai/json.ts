import { completeChat, streamChat, type ChatCompletionMessage } from "./openai-compatible";

/**
 * 从 LLM 返回里抽出第一段合法 JSON。
 */
export function extractJson(raw: string): string {
  const trimmed = raw.trim();

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");
  const candidates = [firstBrace, firstBracket].filter((i) => i >= 0);
  if (candidates.length === 0) return trimmed;

  const start = Math.min(...candidates);
  const startChar = trimmed[start];
  const endChar = startChar === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === startChar) depth++;
    else if (ch === endChar) {
      depth--;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
  }
  return trimmed;
}

export interface CompleteChatJsonOptions {
  retries?: number;
  validate?: (parsed: unknown) => boolean;
}

/**
 * 调用 LLM 并解析 JSON，失败时让 LLM 自我修正再试。
 *
 * - 首轮：使用 streamChat（会通过 AsyncLocalStorage 把 chunk 路由到当前上下文的回调）
 * - 重试轮：使用 completeChat（静默，避免把旧 chunk 重复推到前端）
 */
export async function completeChatJson<T = unknown>(
  messages: ChatCompletionMessage[],
  options: CompleteChatJsonOptions = {},
): Promise<{ parsed: T; raw: string }> {
  const retries = Math.max(0, options.retries ?? 2);
  let lastError: unknown;
  let lastRaw = "";

  const baseMessages = messages.slice();

  for (let attempt = 0; attempt <= retries; attempt++) {
    const turn: ChatCompletionMessage[] = baseMessages.slice();
    if (attempt > 0) {
      turn.push({ role: "assistant", content: lastRaw });
      turn.push({
        role: "user",
        content:
          "上一次返回的不是合法 JSON 或不符合结构，请仅输出符合要求的 JSON，不要任何额外文字、不要 markdown 代码块。",
      });
    }

    try {
      // 首轮用流式（前端能看到打字效果）；重试用非流式（避免重复 chunk）
      const raw = attempt === 0 ? await streamChat(turn) : await completeChat(turn);
      lastRaw = raw;
      const cleaned = extractJson(raw);
      const parsed = JSON.parse(cleaned) as T;
      if (options.validate && !options.validate(parsed)) {
        throw new Error("JSON validate() returned false");
      }
      return { parsed, raw };
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error(
    `LLM JSON parse failed after ${retries + 1} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}
