"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/animate-ui/components/buttons/button";
import { AppIcon } from "@/components/icons";
import { StoryInputComposer } from "@/components/story-input-composer";
import { useToast } from "@/contexts/ToastContext";
import { apiFetch } from "@/lib/api-fetch";
import { PROJECT_STORY_INPUT_MIN_ROWS } from "@/lib/ui/textarea-height";
import { expandHomeStory } from "@/services/home/ai-story-expand";
import { cn } from "@/lib/utils";

interface StageInputProps {
  initialText: string;
  onStart: (text: string) => void;
  disabled?: boolean;
}

export function StageInput({ initialText, onStart, disabled }: StageInputProps) {
  const t = useTranslations("NovelPromotion.stageInput");
  const locale = useLocale();
  const { showToast } = useToast();
  const [story, setStory] = useState(initialText);
  const isComposingRef = useRef(false);

  const expandMutation = useMutation({
    mutationFn: (input: string) =>
      expandHomeStory({
        apiFetch,
        prompt: input,
        locale: locale === "en" ? "en" : "zh",
      }),
    onSuccess: (result) => setStory(result.expandedText),
    onError: (err: unknown) => {
      const detail = err instanceof Error ? err.message : String(err);
      showToast(t("expandFailed", { detail }), "error");
    },
  });

  const handleExpand = useCallback(() => {
    const trimmed = story.trim();
    if (!trimmed) {
      showToast(t("expandEmpty"), "warning");
      return;
    }
    if (expandMutation.isPending) return;
    expandMutation.mutate(trimmed);
  }, [story, expandMutation, showToast, t]);

  const handleStart = useCallback(() => {
    const trimmed = story.trim();
    if (!trimmed) return;
    onStart(trimmed);
  }, [story, onStart]);

  const isExpanding = expandMutation.isPending;
  const charCount = story.length;

  return (
    <StoryInputComposer
      value={story}
      onValueChange={setStory}
      placeholder={t("placeholder")}
      minRows={PROJECT_STORY_INPUT_MIN_ROWS}
      disabled={disabled || isExpanding}
      onCompositionStart={() => { isComposingRef.current = true; }}
      onCompositionEnd={() => { isComposingRef.current = false; }}
      topRight={
        <span className={cn(
          "text-xs tabular-nums transition-colors",
          charCount > 800 ? "text-destructive" : "text-muted-foreground/60",
        )}>
          {t("characters", { count: charCount })}
        </span>
      }
      secondaryActions={
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={handleExpand}
          disabled={disabled || isExpanding}
          aria-busy={isExpanding}
          className="rounded-full text-primary hover:bg-primary/10 hover:text-primary"
        >
          <AppIcon
            name={isExpanding ? "loader" : "sparkles"}
            className={isExpanding ? "animate-spin text-primary" : "text-primary"}
          />
          {isExpanding ? t("expanding") : t("expand")}
        </Button>
      }
      primaryAction={
        <Button
          size="sm"
          onClick={handleStart}
          disabled={disabled || isExpanding || !story.trim()}
          className="rounded-full px-4"
        >
          {t("next")}
          <AppIcon name="arrowRight" />
        </Button>
      }
    />
  );
}
