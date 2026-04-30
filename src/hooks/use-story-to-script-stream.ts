"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ProgressEvent,
  SubstepMeta,
} from "@/lib/workflow/story-to-script/types";

export type StreamPhase = "idle" | "connecting" | "running" | "done" | "error";

export type LogLevel = "info" | "warn" | "error" | "step";

export interface LogEntry {
  ts: number;
  level: LogLevel;
  message: string;
  step?: string;
}

export type SubstepStatus = "pending" | "streaming" | "done" | "error";

export interface SubstepState extends SubstepMeta {
  status: SubstepStatus;
  /** 模型最终输出（text-delta），JSON 在这里 */
  text: string;
  /** 推理 / 思考过程（reasoning-delta），o1 / DeepSeek-R1 / Claude thinking */
  reasoning: string;
  startedAt: number;
  endedAt?: number;
  summary?: string;
  data?: unknown;
  error?: string;
}

export interface StreamMetrics {
  characters?: number;
  locations?: number;
  props?: number;
  clipCount?: number;
  screenplaysFinished?: number;
  screenplaysTotal?: number;
}

export interface StreamState {
  phase: StreamPhase;
  progress: number;
  step: string;
  message: string;
  error: string | null;
  runId: string | null;
  logs: LogEntry[];
  metrics: StreamMetrics;
  substepOrder: string[];
  substeps: Record<string, SubstepState>;
  activeSubstep: string | null;
  result: {
    episodeId: string;
    runId: string;
    clipCount: number;
    screenplaySuccessCount: number;
  } | null;
}

const initialState: StreamState = {
  phase: "idle",
  progress: 0,
  step: "",
  message: "",
  error: null,
  runId: null,
  logs: [],
  metrics: {},
  substepOrder: [],
  substeps: {},
  activeSubstep: null,
  result: null,
};

const MAX_LOGS = 200;
const MAX_CHARS = 40_000;

function appendLog(
  logs: LogEntry[],
  level: LogLevel,
  message: string,
  step?: string,
): LogEntry[] {
  const last = logs[logs.length - 1];
  if (last && last.level === level && last.message === message) return logs;
  const next = logs.concat({ ts: Date.now(), level, message, step });
  return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
}

function reduceEvent(s: StreamState, event: ProgressEvent): StreamState {
  switch (event.type) {
    case "progress": {
      const message = event.message ?? "";
      const logs = message
        ? appendLog(s.logs, "info", message, event.step)
        : s.logs;
      let metrics = s.metrics;
      if (event.step === "screenplay" && message) {
        const m = message.match(/(\d+)\s*\/\s*(\d+)/);
        if (m) {
          metrics = {
            ...metrics,
            screenplaysFinished: Number(m[1]),
            screenplaysTotal: Number(m[2]),
          };
        }
      }
      return {
        ...s,
        phase: "running",
        progress: event.progress,
        step: event.step,
        message,
        metrics,
        logs,
      };
    }

    case "step.done": {
      const data = (event.data ?? {}) as {
        characterCount?: number;
        locationCount?: number;
        propCount?: number;
        clipCount?: number;
      };
      let metrics = s.metrics;
      let summary = `${event.step} 完成`;
      if (event.step === "analyze") {
        metrics = {
          ...metrics,
          characters: data.characterCount,
          locations: data.locationCount,
          props: data.propCount,
        };
        summary = `分析完成 · 人物 ${data.characterCount ?? 0} · 场景 ${
          data.locationCount ?? 0
        } · 道具 ${data.propCount ?? 0}`;
      } else if (event.step === "split") {
        metrics = { ...metrics, clipCount: data.clipCount };
        summary = `切分完成 · 共 ${data.clipCount ?? 0} 段`;
      }
      return {
        ...s,
        step: event.step,
        metrics,
        logs: appendLog(s.logs, "step", summary, event.step),
      };
    }

    case "stream.start": {
      const meta = event.substep;
      const freshSubstep: SubstepState = {
        ...meta,
        status: "streaming",
        text: "",
        reasoning: "",
        startedAt: Date.now(),
      };
      if (s.substeps[meta.substep]) {
        return {
          ...s,
          activeSubstep: meta.substep,
          substeps: { ...s.substeps, [meta.substep]: freshSubstep },
        };
      }
      return {
        ...s,
        activeSubstep: meta.substep,
        substepOrder: s.substepOrder.concat(meta.substep),
        substeps: { ...s.substeps, [meta.substep]: freshSubstep },
      };
    }

    case "stream.delta": {
      const cur = s.substeps[event.substep];
      if (!cur) return s;
      const field = event.kind === "reasoning" ? "reasoning" : "text";
      const updated = (cur[field] + event.delta).slice(-MAX_CHARS);
      return {
        ...s,
        substeps: {
          ...s.substeps,
          [event.substep]: {
            ...cur,
            [field]: updated,
            status: "streaming",
          },
        },
      };
    }

    case "stream.end": {
      const cur = s.substeps[event.substep];
      if (!cur) return s;
      return {
        ...s,
        substeps: {
          ...s.substeps,
          [event.substep]: {
            ...cur,
            status: event.success ? "done" : "error",
            endedAt: Date.now(),
            summary: event.summary,
            data: event.data,
            error: event.error,
          },
        },
      };
    }

    case "log":
      return { ...s, logs: appendLog(s.logs, event.level, event.message) };

    case "done":
      return {
        ...s,
        phase: "done",
        progress: 100,
        result: event.result,
        metrics: {
          ...s.metrics,
          clipCount: event.result.clipCount,
          screenplaysFinished: event.result.screenplaySuccessCount,
          screenplaysTotal: event.result.clipCount,
        },
        logs: appendLog(
          s.logs,
          "step",
          `全部完成 · 共 ${event.result.clipCount} 段，成功生成 ${event.result.screenplaySuccessCount} 段分镜`,
          "done",
        ),
      };

    case "error":
      return {
        ...s,
        phase: "error",
        error: event.message,
        logs: appendLog(s.logs, "error", event.message),
      };

    default:
      return s;
  }
}

export function useStoryToScriptStream(projectId: string | null) {
  const [state, setState] = useState<StreamState>(initialState);
  const abortCtrl = useRef<AbortController | null>(null);

  const reset = useCallback(() => setState(initialState), []);

  const abort = useCallback(() => {
    abortCtrl.current?.abort();
    abortCtrl.current = null;
    setState((s) =>
      s.phase === "done" || s.phase === "idle" ? s : { ...s, phase: "idle" },
    );
  }, []);

  const start = useCallback(
    async (locale = "zh") => {
      if (!projectId) return;
      abort();

      const ctrl = new AbortController();
      abortCtrl.current = ctrl;

      setState({
        ...initialState,
        phase: "connecting",
        logs: [{ ts: Date.now(), level: "info", message: "建立连接..." }],
      });

      try {
        const res = await fetch(
          `/api/novel-promotion/${projectId}/story-to-script-stream`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locale }),
            signal: ctrl.signal,
          },
        );

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          const msg = errData.message ?? res.statusText;
          setState((s) => ({
            ...s,
            phase: "error",
            error: msg,
            logs: appendLog(s.logs, "error", msg),
          }));
          return;
        }

        if (!res.body) {
          setState((s) => ({
            ...s,
            phase: "error",
            error: "No response body",
            logs: appendLog(s.logs, "error", "No response body"),
          }));
          return;
        }

        setState((s) => ({
          ...s,
          phase: "running",
          logs: appendLog(s.logs, "info", "连接已建立，等待进度..."),
        }));

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += value;

          // SSE 帧之间以空行（\n\n / \r\n\r\n）分隔
          const frames = buffer.split(/\r?\n\r?\n/);
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            // 一帧内可能有多行 data: ，需要拼接成一个值
            const dataLines: string[] = [];
            for (const line of frame.split(/\r?\n/)) {
              if (line.startsWith("data:")) {
                dataLines.push(line.slice(5).replace(/^ /, ""));
              }
            }
            if (dataLines.length === 0) continue;
            const raw = dataLines.join("\n").trim();
            if (!raw) continue;
            try {
              const event = JSON.parse(raw) as ProgressEvent;
              setState((s) => reduceEvent(s, event));
            } catch {
              // ignore non-JSON / heartbeat
            }
          }
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        const msg = e instanceof Error ? e.message : String(e);
        setState((s) => ({
          ...s,
          phase: "error",
          error: msg,
          logs: appendLog(s.logs, "error", msg),
        }));
      }
    },
    [projectId, abort],
  );

  useEffect(() => () => { abortCtrl.current?.abort(); }, []);

  return { state, start, abort, reset };
}
