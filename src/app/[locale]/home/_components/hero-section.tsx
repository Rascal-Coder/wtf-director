"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/animate-ui/components/buttons/button";
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid";
import { StoryInputComposer } from "@/components/story-input-composer";
import { LongTextDetectionPrompt } from "@/components/long-text-detection-prompt";
import { LampContainer } from "@/components/ui/lamp";
import { HOME_QUICK_START_MIN_ROWS } from "@/lib/ui/textarea-height";

import { LONG_TEXT_THRESHOLD } from "../_constants";
import { ArtStyleSelector } from "./art-style-selector";
import { VideoRatioSelector } from "./video-ratio-selector";

export function HeroSection() {
  const t = useTranslations("Hero");
  const tPrompt = useTranslations("LongTextPrompt");
  const [story, setStory] = useState("");
  const [videoRatio, setVideoRatio] = useState<string>("21:9");
  const [artStyle, setArtStyle] = useState<string>("comic");
  const [promptOpen, setPromptOpen] = useState(false);
  const isComposingRef = useRef(false);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
  }, []);

  const handleStartCreate = useCallback(() => {
    if (story.trim().length >= LONG_TEXT_THRESHOLD) {
      setPromptOpen(true);
      return;
    }
    // TODO: 接入实际创作流程
  }, [story]);

  const handleSmartSplit = useCallback(() => {
    setPromptOpen(false);
    // TODO: 接入智能拆分流程
  }, []);

  const handleContinueAnyway = useCallback(() => {
    setPromptOpen(false);
    // TODO: 接入直接创作流程
  }, []);

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
              className="rounded-full text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Sparkles className="text-primary" />
              {t("aiHelp")}
            </Button>
          }
          primaryAction={
            <LiquidButton
              size="sm"
              onClick={handleStartCreate}
              className="rounded-full px-4 text-primary-foreground shadow-[0_6px_24px_-6px_color-mix(in_oklab,var(--primary)_70%,transparent)] hover:text-primary-foreground [--liquid-button-background-color:var(--primary)] [--liquid-button-color:color-mix(in_oklab,var(--primary)_75%,white)]"
            >
              {t("startCreate")}
              <ArrowRight />
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
