import {
  completeChat,
  streamChat,
  type ChatCompletionMessage,
  type ChatStreamHandler,
} from "./openai-compatible";

/**
 * 从 LLM 返回里抽出第一段合法 JSON。LLM 经常会在外面包 markdown 代码块或前后散文。
 */
export function extractJson(raw: string): string {
  const trimmed = raw.trim();

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");
  const startCandidates = [firstBrace, firstBracket].filter((i) => i >= 0);
  if (startCandidates.length === 0) return trimmed;

  const start = Math.min(...startCandidates);
  const startChar = trimmed[start];
  const endChar = startChar === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === startChar) depth++;
    else if (ch === endChar) {
      depth--;
      if (depth === 0) {
        return trimmed.slice(start, i + 1);
      }
    }
  }

  return trimmed;
}

export interface CompleteChatJsonOptions {
  retries?: number;
  validate?: (parsed: unknown) => boolean;
  /**
   * 若提供，则采用 streamText 并把 token delta 实时回调出去。
   * 重试轮（如有）不再回调。
   */
  onDelta?: ChatStreamHandler;
}

/**
 * 调用 LLM 并解析 JSON，失败时让 LLM 自我修正再试。
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

    let raw = "";
    try {
      // 仅首轮使用流式（让前端看到"打字"效果）；重试用普通同步以避免重复 delta。
      if (attempt === 0 && options.onDelta) {
        raw = await streamChat(turn, options.onDelta);
      } else {
        raw = await completeChat(turn);
      }
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
