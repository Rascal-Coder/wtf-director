"use client";

import { use, useCallback, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";

import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api-fetch";
import { useStoryToScriptStream } from "@/hooks/use-story-to-script-stream";
import { getNovelPromotionProject } from "@/services/novel-promotion/client";

import { StageInput } from "./_components/stage-input";
import { StageRunning } from "./_components/stage-running";
import { StageDone } from "./_components/stage-done";

type Stage = "input" | "running" | "done";

interface PageProps {
  params: Promise<{ projectId: string; locale: string }>;
}

function deriveStage(phase: ReturnType<typeof useStoryToScriptStream>["state"]["phase"]): Stage {
  if (phase === "connecting" || phase === "running" || phase === "error") return "running";
  if (phase === "done") return "done";
  return "input";
}

export default function NovelPromotionProjectPage({ params }: PageProps) {
  const { projectId } = use(params);
  const locale = useLocale();
  const { showToast } = useToast();
  const t = useTranslations("NovelPromotion");

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

  const handleStart = useCallback(
    (_text: string) => {
      startStream(locale === "en" ? "en" : "zh");
    },
    [startStream, locale],
  );

  const handleRetry = useCallback(() => {
    startStream(locale === "en" ? "en" : "zh");
  }, [startStream, locale]);

  const handleCreateNew = useCallback(() => {
    window.location.href = `/${locale}/home`;
  }, [locale]);

  const rawText = projectData?.episode?.rawText ?? "";
  const isStreamError = streamState.phase === "error";

  return (
    <main className="relative min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            {projectData?.project.title ?? "小说推广"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {projectData?.project.artStyle} · {projectData?.project.ratio}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {stage === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <p className="mb-4 text-sm text-muted-foreground">
                {t("stageInput.subtitle")}
              </p>
              <StageInput
                initialText={rawText}
                onStart={handleStart}
              />
            </motion.div>
          )}

          {stage === "running" && (
            <motion.div
              key="running"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
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
    </main>
  );
}
