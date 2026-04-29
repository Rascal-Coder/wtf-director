/**
 * Clip 在原文中的回锚匹配器。
 *
 * LLM 给的 startText / endText 不一定能在原文里精确出现：
 *  - 全角/半角标点差异
 *  - 空白被规整
 *  - 个别字写错
 *
 * 策略：
 *  1. exact: 直接 indexOf 命中
 *  2. partial: 把空白和标点剥离后再比
 *  3. fuzzy: 取首/尾 6 字滑动找最接近的位置
 *
 * 命中后返回原文中真实的起止下标，便于下游 `content = source.slice(start, end)`。
 */

export type ClipMatchLevel = "exact" | "partial" | "fuzzy";

export interface ClipMatchResult {
  start: number;
  end: number;
  level: ClipMatchLevel;
  content: string;
}

const PUNCT_AND_WS = /[\s\p{P}\p{S}]/gu;

function normalize(input: string): { stripped: string; map: number[] } {
  const map: number[] = [];
  let stripped = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (PUNCT_AND_WS.test(ch)) {
      PUNCT_AND_WS.lastIndex = 0;
      continue;
    }
    PUNCT_AND_WS.lastIndex = 0;
    stripped += ch;
    map.push(i);
  }
  return { stripped, map };
}

export interface ClipMatcher {
  match(
    startText: string,
    endText: string,
    fromIndex?: number,
  ): ClipMatchResult | null;
}

export function createClipContentMatcher(source: string): ClipMatcher {
  const norm = normalize(source);
  const lowerSource = source;

  function findExact(needle: string, from: number): number {
    if (!needle) return -1;
    return lowerSource.indexOf(needle, from);
  }

  function findPartial(needle: string, fromOriginal: number): number {
    const n = normalize(needle);
    if (!n.stripped) return -1;
    const fromStripped = norm.map.findIndex((origIdx) => origIdx >= fromOriginal);
    if (fromStripped < 0) return -1;
    const idx = norm.stripped.indexOf(
      n.stripped,
      Math.max(0, fromStripped),
    );
    if (idx < 0) return -1;
    return norm.map[idx];
  }

  function findFuzzy(needle: string, fromOriginal: number): number {
    const window = needle.replace(PUNCT_AND_WS, "").slice(0, 6);
    if (!window) return -1;
    return findPartial(window, fromOriginal);
  }

  return {
    match(startText, endText, fromIndex = 0): ClipMatchResult | null {
      let level: ClipMatchLevel = "exact";

      let startIdx = findExact(startText, fromIndex);
      if (startIdx < 0) {
        startIdx = findPartial(startText, fromIndex);
        if (startIdx >= 0) level = "partial";
      }
      if (startIdx < 0) {
        startIdx = findFuzzy(startText, fromIndex);
        if (startIdx >= 0) level = "fuzzy";
      }
      if (startIdx < 0) return null;

      let endIdxStart = findExact(endText, startIdx);
      let endLevel: ClipMatchLevel = "exact";
      if (endIdxStart < 0) {
        endIdxStart = findPartial(endText, startIdx);
        if (endIdxStart >= 0) endLevel = "partial";
      }
      if (endIdxStart < 0) {
        endIdxStart = findFuzzy(endText, startIdx);
        if (endIdxStart >= 0) endLevel = "fuzzy";
      }

      if (endIdxStart < 0) {
        endIdxStart = source.length - endText.length;
        endLevel = "fuzzy";
      }

      const endIdx = Math.min(source.length, endIdxStart + endText.length);
      if (endLevel === "fuzzy" || level === "fuzzy") level = "fuzzy";
      else if (endLevel === "partial" && level === "exact") level = "partial";

      return {
        start: startIdx,
        end: endIdx,
        level,
        content: source.slice(startIdx, endIdx),
      };
    },
  };
}
