"use client";

import { useTranslations } from "next-intl";
import { motion } from "motion/react";

import { Button } from "@/components/animate-ui/components/buttons/button";
import { AppIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { ClipDetail } from "@/services/novel-promotion/client";

interface StageDoneProps {
  clipCount: number;
  screenplaySuccessCount: number;
  clips: ClipDetail[];
  onCreateNew?: () => void;
}

const matchBadge: Record<string, string> = {
  exact: "bg-emerald-500/10 text-emerald-500",
  partial: "bg-amber-500/10 text-amber-500",
  fuzzy: "bg-muted text-muted-foreground",
};

export function StageDone({
  clipCount,
  screenplaySuccessCount,
  clips,
  onCreateNew,
}: StageDoneProps) {
  const t = useTranslations("NovelPromotion.stageDone");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle", { clipCount, success: screenplaySuccessCount })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCreateNew}
          className="shrink-0 rounded-full"
        >
          <AppIcon name="plus" />
          {t("createNew")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {clips.map((clip, idx) => {
          const scenes = clip.screenplay?.scenes ?? [];
          const matchLevel = clip.matchLevel ?? "fuzzy";
          return (
            <motion.div
              key={clip.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
              className="group relative flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border/60 transition-shadow hover:shadow-md hover:ring-border"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Clip {clip.index + 1}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    matchBadge[matchLevel] ?? matchBadge["fuzzy"],
                  )}
                >
                  {t(`clipCard.match${matchLevel.charAt(0).toUpperCase()}${matchLevel.slice(1)}` as Parameters<typeof t>[0])}
                </span>
              </div>

              {/* Content preview */}
              <p className="line-clamp-3 text-sm leading-relaxed text-foreground/80">
                {clip.content}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {clip.location && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    <AppIcon name="clapperboard" className="size-2.5" />
                    {clip.location}
                  </span>
                )}
                {clip.characters.slice(0, 3).map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 text-[10px] text-primary"
                  >
                    <AppIcon name="user" className="size-2.5" />
                    {c}
                  </span>
                ))}
              </div>

              {/* Shot count */}
              <div className="mt-auto flex items-center justify-between border-t border-border/40 pt-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AppIcon name="film" className="size-3.5" />
                  {scenes.length > 0
                    ? t("clipCard.shotCount", { count: scenes.length })
                    : t("clipCard.noShots")}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <AppIcon name="externalLink" className="size-3.5" />
                  <span className="sr-only">{t("openClip")}</span>
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
