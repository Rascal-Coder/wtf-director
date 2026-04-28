"use client";

import { Plus } from "lucide-react";

import { Button as MotionButton } from "@/components/animate-ui/primitives/buttons/button";

type CreateProjectCardProps = {
  onClick?: () => void;
};

export function CreateProjectCard({ onClick }: CreateProjectCardProps) {
  return (
    <MotionButton asChild hoverScale={1.02} tapScale={0.99}>
      <button
        type="button"
        onClick={onClick}
        className="group relative flex aspect-[16/10] flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed border-border/60 bg-card/30 text-foreground transition-[border-color,background-color,box-shadow] hover:border-primary/60 hover:bg-card/60 hover:shadow-[0_18px_40px_-22px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
      >
        <span className="flex size-11 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-foreground transition group-hover:border-primary/60 group-hover:text-primary">
          <Plus className="size-5" />
        </span>
        <div className="text-center">
          <div className="text-sm font-semibold text-foreground">创建新项目</div>
          <div className="mt-1 text-xs text-muted-foreground">
            开启您的创作之旅
          </div>
        </div>
      </button>
    </MotionButton>
  );
}
