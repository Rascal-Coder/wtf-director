/**
 * 基于 Vercel AI SDK 的 LLM 调用层。
 *
 * 通过 `@ai-sdk/openai-compatible` 适配任意 OpenAI 兼容服务，
 * 并自动识别两类常见的"思考过程"输出：
 *
 *   1) DeepSeek-V3/R1 / 通义 / 智谱 / xAI 等
 *      → SSE delta 中的 `reasoning_content` 字段
 *      → openai-compatible provider 已原生映射为 `reasoning-delta`
 *
 *   2) QwQ / 部分推理模型
 *      → 在 `content` 中内嵌 `<think>...</think>`
 *      → 由 `extractReasoningMiddleware({ tagName: 'think' })` 提取
 *
 * 想换其他 provider（Anthropic / Google / OpenAI 原生）时，
 * 只需替换 `buildModel` 内的工厂函数即可，上层 streamChat 接口不变。
 *
 * 环境变量：
 *   OPENAI_API_KEY   必填
 *   OPENAI_BASE_URL  可选，默认 https://api.openai.com/v1
 *   OPENAI_MODEL     可选，默认 gpt-4o-mini
 *
 * 流式输出通过 AsyncLocalStorage 透明路由到 LLM 层（chat-stream.ts）。
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  extractReasoningMiddleware,
  generateText,
  streamText,
  wrapLanguageModel,
  type LanguageModel,
} from "ai";

import { emitStreamChunk } from "@/lib/llm/chat-stream";

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function resolveBaseUrl(): string {
  const raw = process.env.OPENAI_BASE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "https://api.openai.com/v1";
}

function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return apiKey;
}

function getModelId(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

let _cachedModel: LanguageModel | null = null;
let _cachedKey: string | null = null;

function buildModel(): LanguageModel {
  const cacheKey = `${resolveBaseUrl()}::${getModelId()}::${getApiKey()}`;
  if (_cachedModel && _cachedKey === cacheKey) return _cachedModel;

  const provider = createOpenAICompatible({
    name: "wtf-director",
    apiKey: getApiKey(),
    baseURL: resolveBaseUrl(),
  });

  // 用 middleware 兜底处理"在正文里嵌 <think> 标签"的模型；
  // 对于已经走 reasoning_content 字段的模型不会有副作用。
  const wrapped = wrapLanguageModel({
    model: provider.chatModel(getModelId()),
    middleware: extractReasoningMiddleware({ tagName: "think" }),
  });

  _cachedModel = wrapped;
  _cachedKey = cacheKey;
  return wrapped;
}

/** 非流式调用（重试时使用），不触发 stream 回调 */
export async function completeChat(
  messages: ChatCompletionMessage[],
): Promise<string> {
  const { text } = await generateText({
    model: buildModel(),
    messages,
    temperature: 0.7,
  });
  const trimmed = text?.trim() ?? "";
  if (!trimmed) throw new Error("Empty model response");
  return trimmed;
}

/**
 * 流式调用。
 *
 * 消费 AI SDK 的 `fullStream`：
 *   - `text-delta`      → text 通道（最终输出，用于 JSON 解析）
 *   - `reasoning-delta` → reasoning 通道（思考过程）
 *
 * 返回值是完整的 text（不含 reasoning），用于后续 JSON 解析。
 */
export async function streamChat(
  messages: ChatCompletionMessage[],
): Promise<string> {
  const result = streamText({
    model: buildModel(),
    messages,
    temperature: 0.7,
  });

  let textAcc = "";

  for await (const part of result.fullStream) {
    const p = part as unknown as {
      type: string;
      text?: string;
      delta?: string;
      error?: unknown;
    };

    if (p.type === "text-delta") {
      const delta = p.text ?? p.delta ?? "";
      if (!delta) continue;
      textAcc += delta;
      await emitStreamChunk("text", delta);
    } else if (p.type === "reasoning-delta") {
      const delta = p.text ?? p.delta ?? "";
      if (delta) await emitStreamChunk("reasoning", delta);
    } else if (p.type === "error") {
      throw p.error instanceof Error
        ? p.error
        : new Error(String(p.error ?? "stream error"));
    }
  }

  const trimmed = textAcc.trim();
  if (!trimmed) throw new Error("Empty model response");
  return trimmed;
}
