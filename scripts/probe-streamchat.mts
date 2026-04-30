/**
 * 端到端验证：调用我们封装的 streamChat，
 * 检查 reasoning / text 是否正确路由。
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const { streamChat } = await import("../src/lib/ai/openai-compatible.js");
const { runWithLLMStreamCallbacks } = await import("../src/lib/llm/chat-stream.js");

let reasoningChars = 0;
let textChars = 0;

const finalText = await runWithLLMStreamCallbacks(
  {
    onChunk: (chunk) => {
      if (chunk.kind === "reasoning") {
        reasoningChars += chunk.delta.length;
        process.stdout.write(`\x1b[33m${chunk.delta}\x1b[0m`);
      } else {
        textChars += chunk.delta.length;
        process.stdout.write(chunk.delta);
      }
    },
  },
  () => streamChat([{ role: "user", content: "9.11 和 9.8 哪个大？简短回答。" }]),
);

console.log("\n\n─── 链路结论 ───");
console.log("reasoning chars :", reasoningChars, reasoningChars > 0 ? "✅" : "❌");
console.log("text chars      :", textChars, textChars > 0 ? "✅" : "❌");
console.log("最终返回         :", finalText);
