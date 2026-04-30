"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/animate-ui/components/buttons/button";
import { AppIcon } from "@/components/icons";
import type { AppIconName } from "@/components/icons";
import type {
  LogEntry,
  StreamMetrics,
  SubstepState,
  SubstepStatus,
} from "@/hooks/use-story-to-script-stream";
import { cn } from "@/lib/utils";

interface StageRunningProps {
  progress: number;
  step: string;
  message: string;
  logs: LogEntry[];
  metrics: StreamMetrics;
  substepOrder: string[];
  substeps: Record<string, SubstepState>;
  activeSubstep: string | null;
  error: string | null;
  onAbort?: () => void;
  onRetry?: () => void;
}

const PHASE_ORDER: Array<SubstepState["phase"]> = ["analyze", "split", "screenplay"];

export function StageRunning(props: StageRunningProps) {
  const {
    progress,
    step,
    message,
    logs,
    metrics,
    substepOrder,
    substeps,
    activeSubstep,
    error,
    onAbort,
    onRetry,
  } = props;

  const t = useTranslations("NovelPromotion.stageRunning");
  const isError = !!error;

  const [selected, setSelected] = useState<string | null>(null);

  // 默认跟随 activeSubstep；用户手动切换后保持选择
  const [followLatest, setFollowLatest] = useState(true);

  // 在渲染期间派生：跟随模式下用 activeSubstep
  const effectiveSelected =
    followLatest && activeSubstep ? activeSubstep : selected;
  const selectedSubstep = effectiveSelected
    ? substeps[effectiveSelected]
    : null;

  const phaseGroups = useMemo(() => groupByPhase(substepOrder, substeps), [
    substepOrder,
    substeps,
  ]);

  const stepLabel = resolveStepLabel(step || (isError ? "error" : "queued"), t);
  const displayProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="rounded-2xl border bg-card px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Story → Script
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold tracking-tight">
              {isError ? t("failed", { detail: "" }) : stepLabel}
            </h2>
            {!isError && message && message !== "subscribed" && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {displayProgress < 100 ? t("running") : t("finished")}
              </p>
              <p className="text-lg font-bold tabular-nums">{displayProgress}%</p>
            </div>
            {!isError && onAbort && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAbort}
                className="rounded-full text-muted-foreground hover:text-foreground"
              >
                <AppIcon name="close" className="mr-1 size-3.5" />
                {t("abort")}
              </Button>
            )}
            {isError && onRetry && (
              <Button
                size="sm"
                onClick={onRetry}
                className="rounded-full px-4"
              >
                <AppIcon name="refresh" className="mr-1 size-3.5" />
                {t("retry")}
              </Button>
            )}
          </div>
        </div>

        {/* progress bar */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className={cn(
              "h-full rounded-full",
              isError ? "bg-destructive" : "bg-primary",
            )}
            initial={false}
            animate={{ width: `${displayProgress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* metrics */}
        <MetricsRow metrics={metrics} />
      </div>

      {/* Body: sidebar + main */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm">
          {PHASE_ORDER.map((phase) => {
            const items = phaseGroups[phase] ?? [];
            if (items.length === 0) {
              return (
                <PhaseSection
                  key={phase}
                  phase={phase}
                  items={[]}
                  selected={effectiveSelected}
                  onSelect={(id) => {
                    setSelected(id);
                    setFollowLatest(false);
                  }}
                />
              );
            }
            return (
              <PhaseSection
                key={phase}
                phase={phase}
                items={items}
                selected={effectiveSelected}
                onSelect={(id) => {
                  setSelected(id);
                  setFollowLatest(false);
                }}
              />
            );
          })}

          <div className="mt-auto flex flex-col gap-2 border-t pt-3">
            <button
              type="button"
              onClick={() => {
                setFollowLatest(true);
                setSelected(activeSubstep);
              }}
              disabled={!activeSubstep || followLatest}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                followLatest
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-muted/40 hover:bg-muted",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              <AppIcon
                name={followLatest ? "check" : "arrowDownCircle"}
                className="mr-1 inline size-3.5"
              />
              {followLatest ? t("sidebar.followingLatest") : t("sidebar.followLatest")}
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-col gap-4">
          {selectedSubstep ? (
            <SubstepPanel substep={selectedSubstep} />
          ) : (
            <EmptySubstepPanel isError={isError} error={error} />
          )}

          <ThinkingLog logs={logs} isError={isError} />
        </main>
      </div>
    </div>
  );
}

/* ────────────────────── 子组件 ────────────────────── */

function MetricsRow({ metrics }: { metrics: StreamMetrics }) {
  const t = useTranslations("NovelPromotion.stageRunning.metrics");

  const screenplayValue =
    metrics.screenplaysTotal != null
      ? `${metrics.screenplaysFinished ?? 0}/${metrics.screenplaysTotal}`
      : "—";

  const cards: Array<{
    key: string;
    icon: AppIconName;
    label: string;
    value: string;
    active: boolean;
  }> = [
    {
      key: "characters",
      icon: "usersRound",
      label: t("characters"),
      value: metrics.characters != null ? String(metrics.characters) : "—",
      active: metrics.characters != null,
    },
    {
      key: "locations",
      icon: "globe2",
      label: t("locations"),
      value: metrics.locations != null ? String(metrics.locations) : "—",
      active: metrics.locations != null,
    },
    {
      key: "props",
      icon: "package",
      label: t("props"),
      value: metrics.props != null ? String(metrics.props) : "—",
      active: metrics.props != null,
    },
    {
      key: "clips",
      icon: "film",
      label: t("clips"),
      value: metrics.clipCount != null ? String(metrics.clipCount) : "—",
      active: metrics.clipCount != null,
    },
    {
      key: "screenplays",
      icon: "clapperboard",
      label: t("screenplays"),
      value: screenplayValue,
      active: metrics.screenplaysTotal != null,
    },
  ];

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.key}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors",
            c.active
              ? "border-primary/30 bg-primary/5"
              : "border-border bg-muted/30",
          )}
        >
          <AppIcon
            name={c.icon}
            className={cn(
              "size-4 shrink-0",
              c.active ? "text-primary" : "text-muted-foreground",
            )}
          />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {c.label}
            </p>
            <motion.p
              key={c.value}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "text-sm font-bold tabular-nums",
                c.active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {c.value}
            </motion.p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PhaseSection({
  phase,
  items,
  selected,
  onSelect,
}: {
  phase: SubstepState["phase"];
  items: SubstepState[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("NovelPromotion.stageRunning");
  const phaseLabel = t(`phase.${phase}`);
  const phaseIcon: AppIconName =
    phase === "analyze"
      ? "brain"
      : phase === "split"
        ? "scissors"
        : "clapperboard";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 px-2 pb-1">
        <AppIcon name={phaseIcon} className="size-3.5 text-muted-foreground" />
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {phaseLabel}
        </h3>
        <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
          {items.length > 0 ? items.length : ""}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="px-2 pb-1 text-[11px] text-muted-foreground/60">
          {t("sidebar.pending")}
        </p>
      ) : (
        items.map((s, idx) => (
          <SubstepRow
            key={s.substep}
            index={idx + 1}
            substep={s}
            selected={selected === s.substep}
            onClick={() => onSelect(s.substep)}
          />
        ))
      )}
    </div>
  );
}

function SubstepRow({
  index,
  substep,
  selected,
  onClick,
}: {
  index: number;
  substep: SubstepState;
  selected: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("NovelPromotion.stageRunning.status");
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-all",
        selected
          ? "border-primary/40 bg-primary/10"
          : "border-transparent hover:border-border hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums ring-1 ring-inset",
          selected
            ? "bg-primary text-primary-foreground ring-primary"
            : "bg-muted text-muted-foreground ring-border",
        )}
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-xs font-medium",
            selected ? "text-foreground" : "text-foreground/85",
          )}
        >
          {substep.title}
        </p>
        <p className="truncate text-[10px] text-muted-foreground">
          {substep.summary ?? statusHint(substep.status, t)}
        </p>
      </div>
      <StatusDot status={substep.status} />
    </button>
  );
}

function StatusDot({ status }: { status: SubstepStatus }) {
  if (status === "streaming") {
    return (
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>
    );
  }
  if (status === "done") {
    return <AppIcon name="check" className="size-3.5 shrink-0 text-emerald-500" />;
  }
  if (status === "error") {
    return <AppIcon name="alert" className="size-3.5 shrink-0 text-destructive" />;
  }
  return <span className="size-2 shrink-0 rounded-full bg-border" />;
}

function statusHint(
  status: SubstepStatus,
  t: ReturnType<typeof useTranslations>,
): string {
  if (status === "streaming") return t("streaming");
  if (status === "done") return t("done");
  if (status === "error") return t("error");
  return t("pending");
}

type StreamTab = "reasoning" | "text";

function SubstepPanel({ substep }: { substep: SubstepState }) {
  const t = useTranslations("NovelPromotion.stageRunning");
  const reasoningRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => substep.startedAt);
  const hasReasoning = substep.reasoning.length > 0;

  // 默认显示输出 tab；首次出现 reasoning 时自动切到思考 tab
  const [tab, setTab] = useState<StreamTab>("text");
  const prevHadReasoning = useRef(false);
  useEffect(() => {
    if (!prevHadReasoning.current && hasReasoning) {
      prevHadReasoning.current = true;
      setTab("reasoning");
    }
  }, [hasReasoning]);

  // 流式中每 200ms 刷新时长
  useEffect(() => {
    if (substep.status !== "streaming") return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [substep.status]);

  // 各 tab 内容自动滚到底
  useEffect(() => {
    if (tab === "reasoning") {
      const el = reasoningRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [substep.reasoning.length, tab]);
  useEffect(() => {
    if (tab === "text") {
      const el = textRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [substep.text.length, tab]);

  const elapsed = (substep.endedAt ?? now) - substep.startedAt;
  const elapsedSec = Math.max(0, Math.round(elapsed / 100) / 10);
  const isStreaming = substep.status === "streaming";

  return (
    <div className="flex flex-col gap-3">
      {/* 主面板：思考 / 输出 */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {/* 顶栏 */}
        <div className="flex items-center gap-1 border-b bg-muted/30 px-3 py-2">
          {/* 状态点 */}
          <span className="relative mr-1 flex size-2 shrink-0">
            {isStreaming ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </>
            ) : (
              <span
                className={cn(
                  "relative inline-flex size-2 rounded-full",
                  substep.status === "done"
                    ? "bg-emerald-500"
                    : substep.status === "error"
                      ? "bg-destructive"
                      : "bg-border",
                )}
              />
            )}
          </span>

          {/* tabs */}
          {hasReasoning && (
            <button
              type="button"
              onClick={() => setTab("reasoning")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                tab === "reasoning"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <AppIcon name="brain" className="size-3.5" />
              {t("panel.tabReasoning")}
              <span className="tabular-nums opacity-60">
                {substep.reasoning.length.toLocaleString()}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab("text")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              tab === "text"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <AppIcon name="terminal" className="size-3.5" />
            {t("panel.tabOutput")}
            <span className="tabular-nums opacity-60">
              {substep.text.length.toLocaleString()}
            </span>
          </button>

          <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {substep.title} · {elapsedSec}s
          </span>
        </div>

        {/* 内容区 */}
        <AnimatePresence mode="wait" initial={false}>
          {tab === "reasoning" ? (
            <motion.div
              key="reasoning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div
                ref={reasoningRef}
                className="max-h-112 min-h-40 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed"
              >
                {substep.reasoning ? (
                  <pre className="whitespace-pre-wrap wrap-break-word text-amber-700 dark:text-amber-300">
                    {substep.reasoning}
                    {isStreaming && (
                      <motion.span
                        animate={{ opacity: [1, 0.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="-mb-0.5 ml-0.5 inline-block h-3 w-1.5 bg-amber-500 align-baseline"
                      />
                    )}
                  </pre>
                ) : (
                  <p className="text-muted-foreground">
                    {isStreaming ? t("panel.waitingReasoning") : t("panel.noOutput")}
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div
                ref={textRef}
                className="max-h-112 min-h-40 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed"
              >
                {substep.text ? (
                  <pre className="whitespace-pre-wrap wrap-break-word text-foreground/90">
                    {substep.text}
                    {isStreaming && (
                      <motion.span
                        animate={{ opacity: [1, 0.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="-mb-0.5 ml-0.5 inline-block h-3 w-1.5 bg-primary align-baseline"
                      />
                    )}
                  </pre>
                ) : (
                  <p className="text-muted-foreground">
                    {isStreaming ? t("panel.waitingTokens") : t("panel.noOutput")}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 最终结果 */}
      <FinalResultCard substep={substep} />
    </div>
  );
}

function FinalResultCard({ substep }: { substep: SubstepState }) {
  const t = useTranslations("NovelPromotion.stageRunning.panel");
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
        <AppIcon
          name={substep.status === "done" ? "check" : "clock"}
          className={cn(
            "size-4",
            substep.status === "done"
              ? "text-emerald-500"
              : substep.status === "error"
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        />
        <h3 className="text-sm font-semibold">{t("finalResult")}</h3>
        {substep.summary && (
          <span className="ml-auto text-[11px] text-muted-foreground">
            {substep.summary}
          </span>
        )}
      </div>
      <div className="px-4 py-3">
        {substep.status === "error" ? (
          <p className="text-xs text-destructive">{substep.error ?? t("failed")}</p>
        ) : substep.status !== "done" ? (
          <p className="text-xs text-muted-foreground">{t("waiting")}</p>
        ) : (
          <FinalResultContent substep={substep} />
        )}
      </div>
    </div>
  );
}

function FinalResultContent({ substep }: { substep: SubstepState }) {
  if (substep.phase === "analyze") {
    const items = (substep.data ?? []) as Array<{
      libName: string;
      description?: string;
    }>;
    if (!Array.isArray(items) || items.length === 0) {
      return <p className="text-xs text-muted-foreground">空</p>;
    }
    return (
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {items.map((it, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs"
          >
            <span className="mt-[2px] size-1.5 shrink-0 rounded-full bg-primary" />
            <div className="min-w-0">
              <p className="truncate font-medium">{it.libName}</p>
              {it.description && (
                <p className="line-clamp-2 text-[11px] text-muted-foreground">
                  {it.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (substep.phase === "split") {
    const items = (substep.data ?? []) as Array<{
      id: string;
      summary?: string;
      location?: string;
    }>;
    if (!Array.isArray(items) || items.length === 0) {
      return <p className="text-xs text-muted-foreground">空</p>;
    }
    return (
      <ol className="flex flex-col gap-1.5">
        {items.map((it, i) => (
          <li
            key={it.id}
            className="flex items-start gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs"
          >
            <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold tabular-nums text-primary">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {it.summary ?? it.id}
              </p>
              {it.location && (
                <p className="truncate text-[11px] text-muted-foreground">
                  {it.location}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    );
  }
  if (substep.phase === "screenplay") {
    const data = substep.data as {
      success?: boolean;
      sceneCount?: number;
      screenplay?: { scenes?: Array<{ shot?: string; visual?: string }> };
    } | undefined;
    const scenes = data?.screenplay?.scenes ?? [];
    if (scenes.length === 0) {
      return <p className="text-xs text-muted-foreground">无镜头</p>;
    }
    return (
      <ol className="flex flex-col gap-1.5">
        {scenes.map((sc, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs"
          >
            <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold tabular-nums text-primary">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{sc.shot ?? "中景"}</p>
              {sc.visual && (
                <p className="line-clamp-2 text-[11px] text-muted-foreground">
                  {sc.visual}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    );
  }
  return null;
}

function EmptySubstepPanel({
  isError,
  error,
}: {
  isError: boolean;
  error: string | null;
}) {
  const t = useTranslations("NovelPromotion.stageRunning.panel");
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-card/40 p-8 text-center shadow-sm">
      {isError ? (
        <>
          <AppIcon name="alert" className="size-8 text-destructive" />
          <p className="max-w-md text-sm text-destructive">{error}</p>
        </>
      ) : (
        <>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <AppIcon name="sparkles" className="size-8 text-primary" />
          </motion.div>
          <p className="text-sm font-medium">{t("emptyTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("emptyHint")}</p>
        </>
      )}
    </div>
  );
}

function ThinkingLog({
  logs,
  isError,
}: {
  logs: LogEntry[];
  isError: boolean;
}) {
  const t = useTranslations("NovelPromotion.stageRunning");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 border-b bg-muted/30 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
      >
        <span className="relative flex size-2">
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75",
              isError ? "bg-destructive" : "animate-ping bg-primary",
            )}
          />
          <span
            className={cn(
              "relative inline-flex size-2 rounded-full",
              isError ? "bg-destructive" : "bg-primary",
            )}
          />
        </span>
        <AppIcon name="terminal" className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{t("thinking.title")}</h3>
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {logs.length} {t("thinking.events")}
        </span>
        <AppIcon
          name={collapsed ? "chevronUp" : "chevronDown"}
          className="size-4 text-muted-foreground"
        />
      </button>

      {!collapsed && (
        <div
          ref={scrollRef}
          className="max-h-48 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed"
        >
          <AnimatePresence initial={false}>
            {logs.length === 0 ? (
              <p className="text-muted-foreground">{t("thinking.empty")}</p>
            ) : (
              logs.map((log, i) => (
                <motion.div
                  key={`${log.ts}-${i}`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-2 py-0.5"
                >
                  <span className="shrink-0 text-muted-foreground/60 tabular-nums">
                    {formatTime(log.ts)}
                  </span>
                  <LogLevelBadge level={log.level} />
                  <span
                    className={cn(
                      "min-w-0 flex-1 wrap-break-word",
                      log.level === "error"
                        ? "text-destructive"
                        : log.level === "step"
                          ? "font-medium text-primary"
                          : log.level === "warn"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-foreground/85",
                    )}
                  >
                    {log.message}
                  </span>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function LogLevelBadge({ level }: { level: LogEntry["level"] }) {
  const config: Record<LogEntry["level"], { label: string; className: string }> = {
    info: { label: "·", className: "bg-muted text-muted-foreground" },
    warn: {
      label: "!",
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    error: { label: "×", className: "bg-destructive/10 text-destructive" },
    step: { label: "✓", className: "bg-primary/10 text-primary" },
  };
  const c = config[level];
  return (
    <span
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded text-[10px]",
        c.className,
      )}
    >
      {c.label}
    </span>
  );
}

/* ────────────────────── helpers ────────────────────── */

function groupByPhase(
  order: string[],
  substeps: Record<string, SubstepState>,
): Record<SubstepState["phase"], SubstepState[]> {
  const out: Record<SubstepState["phase"], SubstepState[]> = {
    analyze: [],
    split: [],
    screenplay: [],
  };
  for (const id of order) {
    const s = substeps[id];
    if (!s) continue;
    out[s.phase].push(s);
  }
  for (const k of Object.keys(out) as Array<keyof typeof out>) {
    out[k].sort((a, b) => a.order - b.order);
  }
  return out;
}

function resolveStepLabel(
  key: string,
  t: ReturnType<typeof useTranslations>,
): string {
  const knownKeys = [
    "prepare",
    "analyze",
    "split",
    "screenplay",
    "story_to_script_persist_done",
    "queued",
    "subscribed",
  ];
  if (knownKeys.includes(key)) {
    return t(`step.${key}`);
  }
  return key;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
