/**
 * 流式 <think>...</think> 标签解析器。
 *
 * 很多推理模型（DeepSeek-R1、QwQ、moonshot-v1-thinking 等）在
 * OpenAI-compatible 接口上把思考过程包在 <think>...</think> 里，
 * 后面才是最终输出（JSON）。
 *
 * 本解析器逐 delta 处理，正确处理标签横跨多个 chunk 的边界情况。
 *
 * 用法：
 *   const parser = new ThinkTagParser();
 *   for delta in stream:
 *     const { reasoning, text } = parser.push(delta);
 *     // reasoning → 思考通道，text → 输出通道
 *   const rest = parser.flush(); // 处理尾部残余
 */

const OPEN_TAG = "<think>";
const CLOSE_TAG = "</think>";

export class ThinkTagParser {
  private inThink = false;
  private pending = "";

  push(delta: string): { reasoning: string; text: string } {
    this.pending += delta;
    let reasoning = "";
    let text = "";

    while (this.pending.length > 0) {
      if (this.inThink) {
        const closeIdx = this.pending.indexOf(CLOSE_TAG);
        if (closeIdx >= 0) {
          // 找到完整的 </think>
          reasoning += this.pending.slice(0, closeIdx);
          this.pending = this.pending.slice(closeIdx + CLOSE_TAG.length);
          this.inThink = false;
        } else {
          // 检查尾部是否是 </think> 的前缀（跨 chunk 边界）
          const partialAt = trailingPartialMatch(this.pending, CLOSE_TAG);
          if (partialAt >= 0) {
            reasoning += this.pending.slice(0, partialAt);
            this.pending = this.pending.slice(partialAt);
            break; // 等下一个 chunk 补全
          }
          reasoning += this.pending;
          this.pending = "";
        }
      } else {
        const openIdx = this.pending.indexOf(OPEN_TAG);
        if (openIdx >= 0) {
          // 找到完整的 <think>
          text += this.pending.slice(0, openIdx);
          this.pending = this.pending.slice(openIdx + OPEN_TAG.length);
          this.inThink = true;
        } else {
          // 检查尾部是否是 <think> 的前缀
          const partialAt = trailingPartialMatch(this.pending, OPEN_TAG);
          if (partialAt >= 0) {
            text += this.pending.slice(0, partialAt);
            this.pending = this.pending.slice(partialAt);
            break;
          }
          text += this.pending;
          this.pending = "";
        }
      }
    }

    return { reasoning, text };
  }

  /** 流结束时调用，清空内部缓冲 */
  flush(): { reasoning: string; text: string } {
    const result = this.inThink
      ? { reasoning: this.pending, text: "" }
      : { reasoning: "", text: this.pending };
    this.pending = "";
    return result;
  }

  get isInThink() {
    return this.inThink;
  }
}

/**
 * 若字符串 `s` 的末尾是 `tag` 的某个非空前缀，返回该前缀的起始位置；
 * 否则返回 -1。
 *
 * 例：s = "hello </th", tag = "</think>" → 返回 6
 */
function trailingPartialMatch(s: string, tag: string): number {
  const maxLen = Math.min(tag.length - 1, s.length);
  for (let len = maxLen; len > 0; len--) {
    if (tag.startsWith(s.slice(-len))) {
      return s.length - len;
    }
  }
  return -1;
}
