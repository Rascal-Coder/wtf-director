import type { PromptLocale } from "@/lib/ai/prompts";
import { runWithLLMStreamCallbacks } from "@/lib/llm/chat-stream";
import { createWorkerLLMStreamCallbacks } from "@/lib/workers/handlers/llm-stream";

import { mapWithConcurrency, withRetry } from "../concurrency";

import {
  buildCharactersIntroduction,
  createArtifact,
  persistAnalysis,
  persistClipsAndScreenplay,
} from "./persist";
import {
  analyzeCharacters,
  analyzeLocations,
  analyzeProps,
  convertClipToScreenplay,
  splitClips,
} from "./steps";
import type { EmitProgress, SubstepMeta } from "./types";

export interface RunStoryToScriptInput {
  runId: string;
  episodeId: string;
  rawText: string;
  locale: PromptLocale;
}

export interface RunStoryToScriptResult {
  episodeId: string;
  runId: string;
  clipCount: number;
  screenplaySuccessCount: number;
}

const SCREENPLAY_CONCURRENCY = 3;

/**
 * 包装一次「会调用 LLM 的子任务」：
 *   1. emit stream.start
 *   2. 用 runWithLLMStreamCallbacks 把 LLM chunk 路由到 Worker 回调
 *      （通过 AsyncLocalStorage，steps/json 层无需显式传 onDelta）
 *   3. emit stream.end（成功 or 失败）
 */
async function runStreamSubstep<T>(
  emit: EmitProgress,
  meta: SubstepMeta,
  fn: () => Promise<T>,
  buildSummary: (result: T) => { summary: string; data?: unknown },
  signal?: AbortSignal,
): Promise<T> {
  await emit({ type: "stream.start", substep: meta });

  const callbacks = createWorkerLLMStreamCallbacks({
    substep: meta.substep,
    emit,
    signal,
  });

  try {
    const result = await runWithLLMStreamCallbacks(callbacks, fn);
    // 等 Worker 顺序队列完全清空，确保所有 stream.delta 在 stream.end 之前到达
    await callbacks.drain();
    const { summary, data } = buildSummary(result);
    await emit({ type: "stream.end", substep: meta.substep, success: true, summary, data });
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await emit({ type: "stream.end", substep: meta.substep, success: false, error: message });
    throw e;
  }
}

/**
 * 故事 → 剧本 主编排函数。
 *
 * Step1（并行）：人物 / 场景 / 道具 分析
 * Step2（串行）：clip 切分（在原文回锚）
 * Step3（并行）：每个 clip 转剧本（容错，失败不阻塞整体）
 */
export async function runStoryToScriptOrchestrator(
  input: RunStoryToScriptInput,
  emit: EmitProgress,
): Promise<RunStoryToScriptResult> {
  const { runId, episodeId, rawText, locale } = input;

  await emit({ type: "progress", progress: 5, step: "prepare", message: "准备资源" });
  await emit({ type: "log", level: "info", message: `读取原文 ${rawText.length} 字` });

  // ── Step 1: 三个分析并行 ──────────────────────────────
  await emit({ type: "progress", progress: 10, step: "analyze", message: "分析人物 / 场景 / 道具" });

  const [characters, locations, props] = await Promise.all([
    runStreamSubstep(
      emit,
      { substep: "analyze.characters", title: "人物分析", phase: "analyze", order: 0 },
      () => withRetry(() => analyzeCharacters(rawText, locale), { attempts: 3 }),
      (v) => ({ summary: `识别到 ${v.length} 个人物`, data: v }),
    ),
    runStreamSubstep(
      emit,
      { substep: "analyze.locations", title: "场景分析", phase: "analyze", order: 1 },
      () => withRetry(() => analyzeLocations(rawText, locale), { attempts: 3 }),
      (v) => ({ summary: `识别到 ${v.length} 个场景`, data: v }),
    ),
    runStreamSubstep(
      emit,
      { substep: "analyze.props", title: "道具分析", phase: "analyze", order: 2 },
      () => withRetry(() => analyzeProps(rawText, locale), { attempts: 3 }),
      (v) => ({ summary: `识别到 ${v.length} 个道具`, data: v }),
    ),
  ]);

  await Promise.all([
    createArtifact({ runId, kind: "analysis.characters", payload: characters }),
    createArtifact({ runId, kind: "analysis.locations", payload: locations }),
    createArtifact({ runId, kind: "analysis.props", payload: props }),
  ]);

  const charactersIntroduction = buildCharactersIntroduction(characters);
  await persistAnalysis({ episodeId, characters, locations, props, charactersIntroduction });

  await emit({
    type: "step.done",
    step: "analyze",
    data: {
      characterCount: characters.length,
      locationCount: locations.length,
      propCount: props.length,
    },
  });

  // ── Step 2: 切片 ──────────────────────────────────────
  await emit({ type: "progress", progress: 40, step: "split", message: "切分剧情片段" });

  const clips = await runStreamSubstep(
    emit,
    { substep: "split", title: "剧情切片", phase: "split", order: 0 },
    () => withRetry(
      () => splitClips({ rawText, locale, characters, locations, props }),
      { attempts: 2 },
    ),
    (cs) => ({ summary: `切出 ${cs.length} 段`, data: cs }),
  );

  if (clips.length === 0) throw new Error("切片失败：未能从原文切出任何片段");

  await createArtifact({ runId, kind: "clips.split", payload: clips });

  const exactCount = clips.filter((c) => c.matchLevel === "exact").length;
  const partialCount = clips.filter((c) => c.matchLevel === "partial").length;
  const fuzzyCount = clips.filter((c) => c.matchLevel === "fuzzy").length;
  await emit({
    type: "log",
    level: "info",
    message: `切片回锚：精确 ${exactCount} · 近似 ${partialCount} · 模糊 ${fuzzyCount}`,
  });

  await emit({ type: "step.done", step: "split", data: { clipCount: clips.length } });

  // ── Step 3: 每个 clip 转剧本，并行 ────────────────────
  await emit({
    type: "progress",
    progress: 60,
    step: "screenplay",
    message: `生成 ${clips.length} 段分镜剧本`,
  });

  let finished = 0;
  const screenplays = await mapWithConcurrency(
    clips,
    SCREENPLAY_CONCURRENCY,
    async (clip, idx) => {
      const meta: SubstepMeta = {
        substep: `screenplay.${clip.id}`,
        title: `分镜 ${idx + 1}：${clip.summary?.slice(0, 16) ?? clip.id}`,
        phase: "screenplay",
        order: idx,
      };

      let result;
      try {
        result = await runStreamSubstep(
          emit,
          meta,
          () => convertClipToScreenplay({ clip, locale }),
          (r) => ({
            summary: r.success ? `生成 ${r.sceneCount} 个镜头` : `失败：${r.error ?? "未知"}`,
            data: r,
          }),
        );
      } catch (e) {
        result = {
          clipId: clip.id,
          success: false,
          sceneCount: 0,
          error: e instanceof Error ? e.message : String(e),
        };
      }

      finished++;
      await emit({
        type: "progress",
        progress: 60 + Math.floor((finished / clips.length) * 35),
        step: "screenplay",
        message: `${finished}/${clips.length} 段已完成`,
      });
      await createArtifact({ runId, kind: "screenplay.clip", refId: clip.id, payload: result });
      return result;
    },
  );

  await emit({ type: "progress", progress: 96, step: "story_to_script_persist_done", message: "写入数据库" });
  await persistClipsAndScreenplay({ episodeId, clips, screenplays });

  const screenplaySuccessCount = screenplays.filter((s) => s.success).length;
  return { episodeId, runId, clipCount: clips.length, screenplaySuccessCount };
}
