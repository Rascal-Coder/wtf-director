/**
 * 探测模型是否支持 reasoning / <think> 输出。
 * 运行：pnpm tsx scripts/probe-model.ts
 */
import "dotenv/config";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
const baseURL = (process.env.OPENAI_BASE_URL?.trim() ?? "https://api.openai.com/v1").replace(/\/$/, "");
const modelId = process.env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini";

console.log(`\n=== Probe: ${modelId} @ ${baseURL} ===\n`);

const provider = createOpenAI({ apiKey, baseURL });

const result = streamText({
  model: provider.chat(modelId),
  messages: [
    {
      role: "user",
      content: "请用一句话介绍你自己，并告诉我你支持哪些能力（如思维链、thinking 等）。",
    },
  ],
  temperature: 0.5,
});

let hasReasoning = false;
let textTokens = 0;
let reasoningTokens = 0;

console.log("─── fullStream parts ───");
for await (const part of result.fullStream) {
  const p = part as unknown as { type: string; text?: string; delta?: string };

  if (p.type === "text-delta") {
    const d = p.text ?? p.delta ?? "";
    process.stdout.write(d);
    textTokens += d.length;

    // 检查是否有 <think> 标签
    if (d.includes("<think>") || d.includes("</think>")) {
      console.log("\n\n[!] 检测到 <think> 标签！模型支持内嵌推理。");
      hasReasoning = true;
    }
  } else if (p.type === "reasoning-delta") {
    const d = p.text ?? p.delta ?? "";
    if (!hasReasoning) {
      hasReasoning = true;
      console.log("\n\n[!] 检测到 reasoning-delta！模型支持原生推理通道。");
    }
    process.stdout.write(`\x1b[33m[reasoning] ${d}\x1b[0m`);
    reasoningTokens += d.length;
  } else if (!["text-start", "text-end", "finish", "step-start", "step-finish", "tool-call", "tool-result"].includes(p.type)) {
    console.log(`\n[part.type = ${p.type}]`, JSON.stringify(p).slice(0, 200));
  }
}

const { usage } = await result.usage;
console.log("\n\n─── 统计 ───");
console.log(`text   : ${textTokens} chars`);
console.log(`reasoning: ${reasoningTokens} chars`);
console.log(`usage  :`, usage);
console.log(`\n结论: ${hasReasoning ? "✅ 模型支持思考输出" : "❌ 模型不支持思考输出（普通文本模型）"}`);
