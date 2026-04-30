"use client";

import { cn } from "@/lib/utils";
import type { ChatAskOption } from "./types";

interface ChatAskCardProps {
  prompt: string;
  options: ChatAskOption[];
  pickedId?: string;
  onPick?: (optionId: string) => void;
}

export function ChatAskCard({
  prompt,
  options,
  pickedId,
  onPick,
}: ChatAskCardProps) {
  const locked = !!pickedId;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm backdrop-blur-sm">
      <p className="px-1 pb-2 text-sm text-foreground">{prompt}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isPicked = pickedId === opt.id;
          const isDimmed = locked && !isPicked;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={locked}
              onClick={() => onPick?.(opt.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                "border-border/60 bg-background/50 text-foreground",
                !locked && "hover:border-primary/60 hover:bg-primary/10 hover:text-primary",
                isPicked && "border-primary/70 bg-primary/15 text-primary",
                isDimmed && "opacity-40",
                locked && "cursor-default",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
