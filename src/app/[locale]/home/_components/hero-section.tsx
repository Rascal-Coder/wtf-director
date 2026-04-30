"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/animate-ui/components/buttons/button";
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid";
import { AppIcon } from "@/components/icons";
import { StoryInputComposer } from "@/components/story-input-composer";
import { LongTextDetectionPrompt } from "@/components/long-text-detection-prompt";
import { LampContainer } from "@/components/ui/lamp";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api-fetch";
import { HOME_QUICK_START_MIN_ROWS } from "@/lib/ui/textarea-height";
import { useRouter } from "@/i18n/navigation";
import { createNovelPromotionProject } from "@/services/novel-promotion/client";

import { LONG_TEXT_THRESHOLD } from "../_constants";
import { ArtStyleSelector } from "./art-style-selector";
import { VideoRatioSelector } from "./video-ratio-selector";

type CreateMode = "ai-help" | "direct";

export function HeroSection() {
  const t = useTranslations("Hero");
  const tPrompt = useTranslations("LongTextPrompt");
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useToast();
  const [story, setStory] = useState("");
  const [videoRatio, setVideoRatio] = useState<string>("21:9");
  const [artStyle, setArtStyle] = useState<string>("comic");
  const [promptOpen, setPromptOpen] = useState(false);
  const [creatingMode, setCreatingMode] = useState<CreateMode | null>(null);
  const isComposingRef = useRef(false);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
  }, []);

  const doCreateProject = useCallback(
    async (rawText: string, mode: CreateMode) => {
      if (creatingMode) return;
      setCreatingMode(mode);
      try {
        const { projectId } = await createNovelPromotionProject({
          apiFetch,
          rawText,
          ratio: videoRatio,
          artStyle,
        });
        router.push(`/novel-promotion/${projectId}?mode=${mode}`);
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        showToast(`创建项目失败：${detail}`, "error");
        setCreatingMode(null);
      }
    },
    [creatingMode, videoRatio, artStyle, router, showToast],
  );

  const handleAiHelp = useCallback(() => {
    const trimmed = story.trim();
    if (!trimmed) return;
    void doCreateProject(trimmed, "ai-help");
  }, [story, doCreateProject]);

  const handleStartCreate = useCallback(() => {
    const trimmed = story.trim();
    if (!trimmed) return;
    if (trimmed.length >= LONG_TEXT_THRESHOLD) {
      setPromptOpen(true);
      return;
    }
    void doCreateProject(trimmed, "direct");
  }, [story, doCreateProject]);

  const handleSmartSplit = useCallback(() => {
    setPromptOpen(false);
    // TODO: 接入智能拆分（先走直接创作兜底）
    void doCreateProject(story.trim(), "direct");
  }, [story, doCreateProject]);

  const handleContinueAnyway = useCallback(() => {
    setPromptOpen(false);
    void doCreateProject(story.trim(), "direct");
  }, [story, doCreateProject]);

  const longTextCopy = useMemo(
    () => ({
      title: tPrompt("title"),
      description: tPrompt("description"),
      strongRecommend: tPrompt("strongRecommend"),
      smartSplitLabel: tPrompt("smartSplitLabel"),
      smartSplitBadge: tPrompt("smartSplitBadge"),
      continueLabel: tPrompt("continueLabel"),
      continueHint: tPrompt("continueHint"),
    }),
    [tPrompt],
  );

  void locale;

  const hasContent = !!story.trim();
  const isCreating = creatingMode !== null;
  const isAiHelpCreating = creatingMode === "ai-help";
  const isDirectCreating = creatingMode === "direct";
  const disableButtons = isCreating || !hasContent;

  return (
    <section className="relative w-full">
      <LampContainer className="min-h-[max(60vh,520px)] md:min-h-[max(64vh,640px)]">
        <div className="flex flex-col items-center px-4">
          <motion.h1
            initial={{ opacity: 0.5, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
            className="max-w-3xl bg-gradient-to-br from-foreground via-primary/80 to-primary bg-clip-text text-center text-4xl font-semibold tracking-tight text-transparent md:text-6xl"
          >
            {t("title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7, ease: "easeOut" }}
            className="mt-4 max-w-2xl text-center text-sm text-muted-foreground md:text-[15px]"
          >
            {t("subtitle")}
          </motion.p>
        </div>
      </LampContainer>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.7, ease: "easeOut" }}
        className="relative z-10 mx-auto -mt-24 w-full max-w-[1600px] px-6 sm:px-10 md:-mt-44 lg:px-12"
      >
        <StoryInputComposer
          value={story}
          onValueChange={setStory}
          placeholder={t("placeholder")}
          minRows={HOME_QUICK_START_MIN_ROWS}
          disabled={isCreating}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          className="bg-card/70 shadow-[0_30px_80px_-30px_color-mix(in_oklab,var(--primary)_45%,transparent)] ring-1 ring-border/60 backdrop-blur-xl"
          textareaClassName="min-h-28 text-foreground placeholder:text-muted-foreground/70"
          selectors={
            <>
              <VideoRatioSelector
                value={videoRatio}
                onChange={setVideoRatio}
              />
              <ArtStyleSelector value={artStyle} onChange={setArtStyle} />
            </>
          }
          secondaryActions={
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleAiHelp}
              disabled={disableButtons}
              aria-busy={isAiHelpCreating}
              className="rounded-full text-primary hover:bg-primary/10 hover:text-primary"
            >
              <AppIcon
                name={isAiHelpCreating ? "loader" : "sparkles"}
                className={
                  isAiHelpCreating ? "animate-spin text-primary" : "text-primary"
                }
              />
              {t("aiHelp")}
            </Button>
          }
          primaryAction={
            <LiquidButton
              size="sm"
              onClick={handleStartCreate}
              disabled={disableButtons}
              aria-busy={isDirectCreating}
              className="rounded-full px-4 text-primary-foreground shadow-[0_6px_24px_-6px_color-mix(in_oklab,var(--primary)_70%,transparent)] hover:text-primary-foreground [--liquid-button-background-color:var(--primary)] [--liquid-button-color:color-mix(in_oklab,var(--primary)_75%,white)]"
            >
              {isDirectCreating ? (
                <AppIcon name="loader" className="animate-spin" />
              ) : null}
              {t("startCreate")}
              {!isDirectCreating && <AppIcon name="arrowRight" />}
            </LiquidButton>
          }
        />
      </motion.div>

      <LongTextDetectionPrompt
        open={promptOpen}
        copy={longTextCopy}
        onClose={() => setPromptOpen(false)}
        onSmartSplit={handleSmartSplit}
        onContinue={handleContinueAnyway}
      />
    </section>
  );
}
