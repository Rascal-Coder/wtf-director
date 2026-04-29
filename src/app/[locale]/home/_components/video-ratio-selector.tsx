"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  Popover,
  PopoverPanel,
  PopoverTrigger,
} from "@/components/animate-ui/components/base/popover";
import { cn } from "@/lib/utils";

import { RATIO_OPTIONS, type RatioOption } from "../_constants";

const ratioLabel = (option: RatioOption) => `${option.w}:${option.h}`;

type VideoRatioSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

const RATIO_GLYPH_BOX = 22;

function RatioGlyph({
  w,
  h,
  active,
  className,
}: {
  w: number;
  h: number;
  active?: boolean;
  className?: string;
}) {
  const scale = RATIO_GLYPH_BOX / Math.max(w, h);
  const width = w * scale;
  const height = h * scale;

  return (
    <span
      aria-hidden
      className={cn(
        "flex items-center justify-center",
        className,
      )}
      style={{ width: RATIO_GLYPH_BOX, height: RATIO_GLYPH_BOX }}
    >
      <span
        className={cn(
          "block rounded-[5px] border-[1.5px] transition-colors",
          active
            ? "border-primary bg-primary/15"
            : "border-muted-foreground/60",
        )}
        style={{ width, height }}
      />
    </span>
  );
}

export function VideoRatioSelector({
  value,
  onChange,
}: VideoRatioSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = RATIO_OPTIONS.find((o) => o.value === value) ?? RATIO_OPTIONS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex h-8 items-center gap-2 rounded-full border bg-card/60 px-3 text-xs font-medium text-foreground transition-all",
          "border-border/60 hover:border-border hover:bg-card/80",
          open && "border-primary/60 ring-2 ring-primary/20",
        )}
      >
        <RatioGlyph w={selected.w} h={selected.h} active />
        <span className="text-foreground">{ratioLabel(selected)}</span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </PopoverTrigger>

      <PopoverPanel
        align="start"
        sideOffset={8}
        className="w-auto rounded-2xl border border-border/60 bg-popover/95 p-3 shadow-xl backdrop-blur-xl"
      >
        <div className="grid grid-cols-5 gap-1.5">
          {RATIO_OPTIONS.map((option) => (
            <RatioOptionCell
              key={option.value}
              option={option}
              active={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            />
          ))}
        </div>
      </PopoverPanel>
    </Popover>
  );
}

function RatioOptionCell({
  option,
  active,
  onClick,
}: {
  option: RatioOption;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group flex h-[68px] w-[60px] flex-col items-center justify-center gap-1.5 rounded-xl border px-1 transition-all",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <RatioGlyph w={option.w} h={option.h} active={active} />
      <span
        className={cn(
          "text-[11px] font-medium leading-none",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {ratioLabel(option)}
      </span>
    </button>
  );
}
