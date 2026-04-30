"use client";

import { use, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";

import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api-fetch";
import { useStoryToScriptStream } from "@/hooks/use-story-to-script-stream";
import { useNovelChatFlow, type CreateMode } from "@/hooks/use-novel-chat-flow";
import { getNovelPromotionProject } from "@/services/novel-promotion/client";

import { ChatPanel } from "./_components/chat/chat-panel";
import { StagePlaceholder } from "./_components/stage-placeholder";
import { StageRunning } from "./_components/stage-running";
import { StageDone } from "./_components/stage-done";

type Stage = "chat" | "running" | "done";

interface PageProps {
  params: Promise<{ projectId: string; locale: string }>;
}

function deriveStage(phase: ReturnType<typeof useStoryToScriptStream>["state"]["phase"]): Stage {
  if (phase === "connecting" || phase === "running" || phase === "error") return "running";
  if (phase === "done") return "done";
  return "chat";
}

function parseMode(value: string | null): CreateMode | null {
  if (value === "ai-help" || value === "direct") return value;
  return null;
}

export default function NovelPromotionProjectPage({ params }: PageProps) {
  const { projectId } = use(params);
  const locale = useLocale();
  const { showToast } = useToast();
  const t = useTranslations("NovelPromotion");
  const searchParams = useSearchParams();
  const mode = useMemo(() => parseMode(searchParams.get("mode")), [searchParams]);
  const localeKey: "zh" | "en" = locale === "en" ? "en" : "zh";

  const {
    data: projectData,
    isError: isLoadError,
    error: loadError,
    refetch: refetchProject,
  } = useQuery({
    queryKey: ["novel-promotion-project", projectId],
    queryFn: () => getNovelPromotionProject({ apiFetch, projectId }),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (isLoadError && loadError) {
      const detail = loadError instanceof Error ? loadError.message : String(loadError);
      showToast(t("errors.loadFailed", { detail }), "error");
    }
  }, [isLoadError, loadError, showToast, t]);

  const { state: streamState, start: startStream, abort: abortStream } =
    useStoryToScriptStream(projectId);

  const stage = deriveStage(streamState.phase);
  const clipCount = streamState.result?.clipCount ?? 0;
  const successCount = streamState.result?.screenplaySuccessCount ?? 0;

  useEffect(() => {
    if (streamState.phase === "done") {
      refetchProject();
    }
  }, [streamState.phase, refetchProject]);

  const handleStartPipeline = useCallback(() => {
    startStream(localeKey);
  }, [startStream, localeKey]);

  const rawText = projectData?.episode?.rawText ?? "";
  const isStreamError = streamState.phase === "error";

  const { messages, pick } = useNovelChatFlow({
    projectId,
    mode,
    rawText,
    locale: localeKey,
    streamState,
    onStartPipeline: handleStartPipeline,
  });

  const handleRetry = useCallback(() => {
    startStream(localeKey);
  }, [startStream, localeKey]);

  const handleCreateNew = useCallback(() => {
    window.location.href = `/${locale}/home`;
  }, [locale]);

  return (
    <main className="relative w-full bg-background text-foreground lg:flex lg:h-screen lg:overflow-hidden">
      {/* Left scrollable content area */}
      <div className="min-w-0 lg:flex-1 lg:overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:h-full lg:px-8">
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-xl font-bold tracking-tight">
              {projectData?.project.title ?? t("untitled")}
            </h1>
            {projectData?.project.artStyle && (
              <p className="mt-1 text-xs text-muted-foreground">
                {projectData.project.artStyle} · {projectData.project.ratio}
              </p>
            )}
          </div>

          <AnimatePresence mode="wait">
            {stage === "chat" && (
              <motion.div
                key="chat-stage"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex-1 min-h-0"
              >
                <StagePlaceholder />
              </motion.div>
            )}

            {stage === "running" && (
              <motion.div
                key="running"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 min-h-0"
              >
                <StageRunning
                  progress={streamState.progress}
                  step={streamState.step}
                  message={streamState.message}
                  logs={streamState.logs}
                  metrics={streamState.metrics}
                  substepOrder={streamState.substepOrder}
                  substeps={streamState.substeps}
                  activeSubstep={streamState.activeSubstep}
                  error={isStreamError ? streamState.error : null}
                  onAbort={!isStreamError ? abortStream : undefined}
                  onRetry={isStreamError ? handleRetry : undefined}
                />
              </motion.div>
            )}

            {stage === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="flex-1 min-h-0"
              >
                <StageDone
                  clipCount={clipCount}
                  screenplaySuccessCount={successCount}
                  clips={projectData?.episode?.clips ?? []}
                  onCreateNew={handleCreateNew}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right chat column: full screen height, flush to right edge */}
      <div className="w-full border-t border-border/60 lg:h-screen lg:w-[400px] lg:shrink-0 lg:border-t-0 lg:border-l">
        <ChatPanel
          messages={messages}
          onPick={pick}
          className="h-[60vh] rounded-none border-0 bg-card/40 shadow-none lg:h-full"
        />
      </div>
    </main>
  );
}
