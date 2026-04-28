import type { LongTextDetectionPromptCopy } from "@/components/long-text-detection-prompt";

export type RatioOption = {
  value: string;
  label: string;
  w: number;
  h: number;
};

export const RATIO_OPTIONS: RatioOption[] = [
  { value: "16:9", label: "16:9", w: 16, h: 9 },
  { value: "9:16", label: "9:16", w: 9, h: 16 },
  { value: "1:1", label: "1:1", w: 1, h: 1 },
  { value: "3:2", label: "3:2", w: 3, h: 2 },
  { value: "2:3", label: "2:3", w: 2, h: 3 },
  { value: "4:3", label: "4:3", w: 4, h: 3 },
  { value: "3:4", label: "3:4", w: 3, h: 4 },
  { value: "5:4", label: "5:4", w: 5, h: 4 },
  { value: "4:5", label: "4:5", w: 4, h: 5 },
  { value: "21:9", label: "21:9", w: 21, h: 9 },
];

export type StyleOption = {
  value: string;
  label: string;
};

export const STYLE_OPTIONS: StyleOption[] = [
  { value: "comic", label: "漫画风" },
  { value: "guoman", label: "精致国漫" },
  { value: "anime", label: "日系动漫风" },
  { value: "realistic", label: "真人风格" },
];

export const LONG_TEXT_THRESHOLD = 10;

export const LONG_TEXT_PROMPT_COPY: LongTextDetectionPromptCopy = {
  title: "检测到长文本",
  description:
    "你输入的内容较长，直接生成可能会超出单条故事的最佳长度。建议先让 AI 智能拆分为多段，质量更稳定。",
  strongRecommend: "强烈推荐：使用智能拆分，确保每段都在最佳生成区间。",
  smartSplitLabel: "智能拆分",
  smartSplitBadge: "推荐",
  continueLabel: "继续直接创作",
  continueHint: "可能影响生成质量",
};
