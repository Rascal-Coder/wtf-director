"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ProgressEvent,
  SubstepMeta,
} from "@/lib/workflow/story-to-script/types";

export type StreamPhase =
  | "idle"
  | "connecting"
  | "running"
  | "done"
  | "error";

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
  text: string;
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
  /** substep 顺序数组（用于侧边栏） */
  substepOrder: string[];
  /** 按 substepId 索引 */
  substeps: Record<string, SubstepState>;
  /** 当前最近一个 streaming 中或刚结束的 substep（用于默认选中） */
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
const MAX_TEXT_PER_SUBSTEP = 40_000;

function appendLog(
  logs: LogEntry[],
  level: LogLevel,
  message: string,
  step?: string,
): LogEntry[] {
  const last = logs[logs.length - 1];
  if (last && last.level === level && last.message === message) return logs;
  const next = logs.concat({ ts: Date.now(), level, message, step });
  return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
}

/**
 * 订阅 /api/novel-promotion/[projectId]/story-to-script-stream 的 SSE 流。
 *
 * 调用 `start(locale)` 开始；`abort()` 中途取消。
 * 连接断开 / done / error 后自动清理。
 */
export function useStoryToScriptStream(projectId: string | null) {
  const [state, setState] = useState<StreamState>(initialState);
  const abortCtrl = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const abort = useCallback(() => {
    abortCtrl.current?.abort();
    abortCtrl.current = null;
    setState((s) =>
      s.phase === "done" || s.phase === "idle" ? s : { ...s, phase: "idle" },
    );
  }, []);

  const start = useCallback(
    async (locale: string = "zh") => {
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
            error?: string;
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
          const msg = "No response body";
          setState((s) => ({
            ...s,
            phase: "error",
            error: msg,
            logs: appendLog(s.logs, "error", msg),
          }));
          return;
        }

        setState((s) => ({
          ...s,
          phase: "running",
          logs: appendLog(s.logs, "info", "连接已建立，等待进度..."),
        }));

        const reader = res.body
          .pipeThrough(new TextDecoderStream())
          .getReader();
        readerRef.current = reader;

        let buffer = "";
        let currentEvent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += value;

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              const raw = line.slice(5).trim();
              if (!raw) continue;
              try {
                const event = JSON.parse(raw) as ProgressEvent;
                // eslint-disable-next-line react-hooks/immutability
                applyEvent(event, currentEvent);
              } catch {
                // ignore non-JSON (e.g. heartbeat comments)
              }
              currentEvent = "";
            } else if (line.startsWith(": ping")) {
              // heartbeat – ignore
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId, abort],
  );

  function applyEvent(event: ProgressEvent, _rawType: string) {
    setState((s) => {
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
          if (s.substeps[meta.substep]) {
            // 已存在（不太可能），重置
            return {
              ...s,
              activeSubstep: meta.substep,
              substeps: {
                ...s.substeps,
                [meta.substep]: {
                  ...meta,
                  status: "streaming",
                  text: "",
                  startedAt: Date.now(),
                },
              },
            };
          }
          return {
            ...s,
            activeSubstep: meta.substep,
            substepOrder: s.substepOrder.concat(meta.substep),
            substeps: {
              ...s.substeps,
              [meta.substep]: {
                ...meta,
                status: "streaming",
                text: "",
                startedAt: Date.now(),
              },
            },
          };
        }
        case "stream.delta": {
          const cur = s.substeps[event.substep];
          if (!cur) return s;
          const nextText = (cur.text + event.delta).slice(-MAX_TEXT_PER_SUBSTEP);
          return {
            ...s,
            substeps: {
              ...s.substeps,
              [event.substep]: { ...cur, text: nextText, status: "streaming" },
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
          return {
            ...s,
            logs: appendLog(s.logs, event.level, event.message),
          };
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
    });
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      abortCtrl.current?.abort();
    };
  }, []);

  return { state, start, abort, reset };
}
