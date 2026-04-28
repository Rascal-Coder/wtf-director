"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/animate-ui/components/buttons/button";
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid";
import { StoryInputComposer } from "@/components/story-input-composer";
import { LongTextDetectionPrompt } from "@/components/long-text-detection-prompt";
import { LampContainer } from "@/components/ui/lamp";
import { HOME_QUICK_START_MIN_ROWS } from "@/lib/ui/textarea-height";

import { LONG_TEXT_PROMPT_COPY, LONG_TEXT_THRESHOLD } from "../_constants";
import { ArtStyleSelector } from "./art-style-selector";
import { VideoRatioSelector } from "./video-ratio-selector";

export function HeroSection() {
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

  return (
    <section className="relative w-full">
      <LampContainer className="min-h-[60vh] md:min-h-[64vh]">
        <div className="flex flex-col items-center px-4">
          <motion.h1
            initial={{ opacity: 0.5, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
            className="max-w-3xl bg-gradient-to-br from-foreground via-primary/80 to-primary bg-clip-text text-center text-4xl font-semibold tracking-tight text-transparent md:text-6xl"
          >
            从灵感到银幕
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7, ease: "easeOut" }}
            className="mt-4 max-w-2xl text-center text-sm text-muted-foreground md:text-[15px]"
          >
            把脑海里的故事，交给 AI 帮你拆分、分镜、生图，一路到银幕
          </motion.p>
        </div>
      </LampContainer>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.7, ease: "easeOut" }}
        className="relative z-10 mx-auto -mt-44 w-full max-w-[1600px] px-6 sm:px-10 lg:px-12"
      >
        <StoryInputComposer
          value={story}
          onValueChange={setStory}
          placeholder="由一个想法或故事开始..."
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
              AI 帮我写
            </Button>
          }
          primaryAction={
            <LiquidButton
              size="sm"
              onClick={handleStartCreate}
              className="rounded-full px-4 text-primary-foreground shadow-[0_6px_24px_-6px_color-mix(in_oklab,var(--primary)_70%,transparent)] hover:text-primary-foreground [--liquid-button-background-color:var(--primary)] [--liquid-button-color:color-mix(in_oklab,var(--primary)_75%,white)]"
            >
              开始创作
              <ArrowRight />
            </LiquidButton>
          }
        />
      </motion.div>

      <LongTextDetectionPrompt
        open={promptOpen}
        copy={LONG_TEXT_PROMPT_COPY}
        onClose={() => setPromptOpen(false)}
        onSmartSplit={handleSmartSplit}
        onContinue={handleContinueAnyway}
      />
    </section>
  );
}
