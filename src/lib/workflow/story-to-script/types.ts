import type { ClipMatchLevel } from "../clip-matcher";

export interface CharacterEntry {
  libName: string;
  description?: string;
  aliases?: string[];
}

export interface LocationEntry {
  libName: string;
  description?: string;
}

export interface PropEntry {
  libName: string;
  description?: string;
}

export interface ClipEntry {
  id: string;
  startText: string;
  endText: string;
  content: string;
  summary?: string;
  location?: string;
  characters: string[];
  props: string[];
  matchLevel: ClipMatchLevel;
  startIndex: number;
  endIndex: number;
}

export interface ScreenplayScene {
  sceneNo: number;
  shot: string;
  duration: number | string;
  visual: string;
  dialogue?: string;
  sfx?: string;
}

export interface ScreenplayResult {
  clipId: string;
  success: boolean;
  sceneCount: number;
  screenplay?: { scenes: ScreenplayScene[] };
  error?: string;
}

/** 子任务（substep）粒度的实时输出事件 */
export interface SubstepMeta {
  /** 子任务唯一 ID，例如 analyze.characters / split / screenplay.clip_3 */
  substep: string;
  /** 用户可见标题，例如「人物分析」「分镜：clip_3」 */
  title: string;
  /** 父阶段：analyze / split / screenplay */
  phase: "analyze" | "split" | "screenplay";
  /** 在阶段内的序号（用于侧边栏排序） */
  order: number;
}

export type ProgressEvent =
  | { type: "progress"; progress: number; step: string; message?: string }
  | { type: "log"; level: "info" | "warn" | "error"; message: string }
  | { type: "step.done"; step: string; data?: unknown }
  | { type: "stream.start"; substep: SubstepMeta }
  | {
      type: "stream.delta";
      substep: string;
      /** 'text' = 模型最终输出；'reasoning' = 思考过程 token */
      kind: "text" | "reasoning";
      delta: string;
    }
  | {
      type: "stream.end";
      substep: string;
      success: boolean;
      summary?: string;
      data?: unknown;
      error?: string;
    }
  | {
      type: "done";
      result: {
        episodeId: string;
        clipCount: number;
        screenplaySuccessCount: number;
        runId: string;
      };
    }
  | { type: "error"; message: string };

export type EmitProgress = (event: ProgressEvent) => void | Promise<void>;
