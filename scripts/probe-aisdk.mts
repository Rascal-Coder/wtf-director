/**
 * 验证 AI SDK 各 provider 对 reasoning 的解析能力。
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { streamText, wrapLanguageModel, extractReasoningMiddleware } from "ai";

const apiKey = process.env.OPENAI_API_KEY!.trim();
const baseURL = process.env.OPENAI_BASE_URL!.trim().replace(/\/$/, "");
const modelId = process.env.OPENAI_MODEL!.trim();

const messages = [
  { role: "user" as const, content: "9.11 和 9.8 哪个大？简短回答。" },
];

async function probe(label: string, model: ReturnType<typeof createOpenAICompatible>["chatModel"] extends (...a: never[]) => infer R ? R : never) {
  console.log(`\n=== ${label} ===`);
  const result = streamText({ model, messages, temperature: 0.5 });
  let r = 0, t = 0;
  for await (const part of result.fullStream) {
    const p = part as unknown as { type: string; text?: string; delta?: string };
    if (p.type === "reasoning-delta") {
      r += (p.text ?? p.delta ?? "").length;
      process.stdout.write(`\x1b[33m${p.text ?? p.delta ?? ""}\x1b[0m`);
    } else if (p.type === "text-delta") {
      t += (p.text ?? p.delta ?? "").length;
      process.stdout.write(p.text ?? p.delta ?? "");
    }
  }
  console.log(`\n  → reasoning ${r} chars, text ${t} chars`);
}

// A: openai-compatible 直接调
const oc = createOpenAICompatible({ name: "deepseek-oc", apiKey, baseURL });
await probe("A: openai-compatible 原生", oc.chatModel(modelId));

// B: deepseek provider
const ds = createDeepSeek({ apiKey, baseURL });
await probe("B: @ai-sdk/deepseek", ds.chat(modelId));

// C: openai-compatible + extractReasoningMiddleware (<think> 标签)
const cWrapped = wrapLanguageModel({
  model: oc.chatModel(modelId),
  middleware: extractReasoningMiddleware({ tagName: "think" }),
});
await probe("C: openai-compatible + extractReasoning(<think>)", cWrapped);
