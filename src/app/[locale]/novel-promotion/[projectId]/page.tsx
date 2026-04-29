"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";

import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api-fetch";
import { useStoryToScriptStream } from "@/hooks/use-story-to-script-stream";
import { getNovelPromotionProject } from "@/services/novel-promotion/client";
import type { ClipDetail } from "@/services/novel-promotion/client";

import { StageInput } from "./_components/stage-input";
import { StageRunning } from "./_components/stage-running";
import { StageDone } from "./_components/stage-done";

type Stage = "input" | "running" | "done";

interface PageProps {
  params: Promise<{ projectId: string; locale: string }>;
}

export default function NovelPromotionProjectPage({ params }: PageProps) {
  const { projectId } = use(params);
  const locale = useLocale();
  const { showToast } = useToast();
  const t = useTranslations("NovelPromotion");

  const [stage, setStage] = useState<Stage>("input");
  const [clips, setClips] = useState<ClipDetail[]>([]);
  const [clipCount, setClipCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);

  const { data: projectData, isError: isLoadError, error: loadError } = useQuery({
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

  // Sync stream phase → stage
  useEffect(() => {
    if (streamState.phase === "connecting" || streamState.phase === "running") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStage("running");
    } else if (streamState.phase === "done") {
      setStage("done");
      if (streamState.result) {
        setClipCount(streamState.result.clipCount);
        setSuccessCount(streamState.result.screenplaySuccessCount);
      }
    } else if (streamState.phase === "error") {
      setStage("running"); // stay on running stage to show error state
    }
  }, [streamState.phase, streamState.result]);

  // Refresh clips when done
  const { refetch: refetchProject } = useQuery({
    queryKey: ["novel-promotion-project", projectId],
    queryFn: () => getNovelPromotionProject({ apiFetch, projectId }),
    enabled: false,
  });

  useEffect(() => {
    if (streamState.phase === "done") {
      refetchProject().then(({ data }) => {
        if (data?.episode?.clips) {
          setClips(data.episode.clips);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamState.phase]);

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
                clips={clips.length > 0 ? clips : (projectData?.episode?.clips ?? [])}
                onCreateNew={handleCreateNew}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
