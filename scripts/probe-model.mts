/**
 * 探测模型是否支持 reasoning / <think> 输出。
 * 运行：pnpm tsx scripts/probe-model.mts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
const baseURL = (process.env.OPENAI_BASE_URL?.trim() ?? "https://api.openai.com/v1").replace(/\/$/, "");
const modelId = process.env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini";

console.log(`\n=== Probe: ${modelId} @ ${baseURL} ===\n`);

const provider = createOpenAI({ apiKey, baseURL });

async function main() {
  const result = streamText({
    model: provider.chat(modelId),
    messages: [
      {
        role: "user",
        content: "请用一句话介绍你自己。",
      },
    ],
    temperature: 0.5,
  });

  let hasReasoningDelta = false;
  let hasThinkTag = false;
  let rawOutput = "";

  console.log("─── raw output ───");
  for await (const part of result.fullStream) {
    const p = part as unknown as { type: string; text?: string; delta?: string };

    if (p.type === "text-delta") {
      const d = p.text ?? p.delta ?? "";
      process.stdout.write(d);
      rawOutput += d;
    } else if (p.type === "reasoning-delta") {
      const d = p.text ?? p.delta ?? "";
      hasReasoningDelta = true;
      process.stdout.write(`\x1b[33m[REASONING]${d}\x1b[0m`);
    } else if (!["text-start","text-end","finish","step-start","step-finish"].includes(p.type)) {
      console.log(`\n  [part=${p.type}]`, JSON.stringify(p).slice(0, 120));
    }
  }

  if (rawOutput.includes("<think>")) hasThinkTag = true;

  console.log("\n\n─── 结论 ───");
  console.log("原生 reasoning-delta :", hasReasoningDelta ? "✅ 有" : "❌ 无");
  console.log("<think> 标签        :", hasThinkTag ? "✅ 有" : "❌ 无");
  if (!hasReasoningDelta && !hasThinkTag) {
    console.log("\n⚠️  当前模型（" + modelId + "）不输出思考过程。");
    console.log("   可换用支持思维链的模型，例如：");
    console.log("   - deepseek-reasoner（DeepSeek-R1）");
    console.log("   - qwq-32b");
    console.log("   - claude-3-7-sonnet-20250219 (extended thinking)");
  }
}

main().catch(console.error);
