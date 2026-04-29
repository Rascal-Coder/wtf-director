export type RatioOption = {
  value: string;
  w: number;
  h: number;
};

export const RATIO_OPTIONS: RatioOption[] = [
  { value: "16:9", w: 16, h: 9 },
  { value: "9:16", w: 9, h: 16 },
  { value: "1:1", w: 1, h: 1 },
  { value: "3:2", w: 3, h: 2 },
  { value: "2:3", w: 2, h: 3 },
  { value: "4:3", w: 4, h: 3 },
  { value: "3:4", w: 3, h: 4 },
  { value: "5:4", w: 5, h: 4 },
  { value: "4:5", w: 4, h: 5 },
  { value: "21:9", w: 21, h: 9 },
];

export type StyleOptionValue = "comic" | "guoman" | "anime" | "realistic";

export const STYLE_OPTION_VALUES: StyleOptionValue[] = [
  "comic",
  "guoman",
  "anime",
  "realistic",
];

export const LONG_TEXT_THRESHOLD = 10;
