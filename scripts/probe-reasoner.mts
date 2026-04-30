/**
 * 直接调 DeepSeek-Reasoner，绕过我们的封装。
 * 同时打印原始 SSE 帧，看 reasoning_content / <think> 到底来不来。
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
const baseURL = (process.env.OPENAI_BASE_URL?.trim() ?? "").replace(/\/$/, "");
const TEST_MODEL = process.argv[2] ?? "deepseek-reasoner";

console.log(`\n=== RAW probe: ${TEST_MODEL} @ ${baseURL} ===\n`);

const res = await fetch(`${baseURL}/chat/completions`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: TEST_MODEL,
    stream: true,
    messages: [{ role: "user", content: "9.11 和 9.8 哪个大？" }],
  }),
});

if (!res.ok || !res.body) {
  console.error("HTTP", res.status, await res.text());
  process.exit(1);
}

const reader = res.body.getReader();
const dec = new TextDecoder();
let buf = "";
let frameCount = 0;
let hasReasoningContent = false;
let hasContent = false;
let hasThinkTag = false;

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += dec.decode(value, { stream: true });
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (payload === "[DONE]") continue;
    let json: { choices?: { delta?: Record<string, unknown> }[] };
    try {
      json = JSON.parse(payload);
    } catch {
      continue;
    }
    const delta = json.choices?.[0]?.delta;
    if (!delta) continue;
    frameCount++;

    if (frameCount <= 3) {
      console.log(`[frame ${frameCount}]`, JSON.stringify(delta));
    }

    if ("reasoning_content" in delta && delta.reasoning_content) {
      hasReasoningContent = true;
      process.stdout.write(`\x1b[33m${delta.reasoning_content}\x1b[0m`);
    }
    if ("content" in delta && typeof delta.content === "string" && delta.content) {
      hasContent = true;
      process.stdout.write(delta.content);
      if (delta.content.includes("<think>")) hasThinkTag = true;
    }
  }
}

console.log("\n\n─── 原始 API 结论 ───");
console.log("  reasoning_content 字段 :", hasReasoningContent ? "✅ 有" : "❌ 无");
console.log("  content 字段           :", hasContent ? "✅ 有" : "❌ 无");
console.log("  <think> 标签           :", hasThinkTag ? "✅ 有" : "❌ 无");
console.log("  总帧数                  :", frameCount);
