"use client";

import { useState } from "react";
import { ChevronDown, Wand2 } from "lucide-react";

import {
  Popover,
  PopoverPanel,
  PopoverTrigger,
} from "@/components/animate-ui/components/base/popover";
import { cn } from "@/lib/utils";

import { STYLE_OPTIONS, type StyleOption } from "../_constants";

type ArtStyleSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ArtStyleSelector({ value, onChange }: ArtStyleSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected =
    STYLE_OPTIONS.find((o) => o.value === value) ?? STYLE_OPTIONS[0];

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
        <Wand2 className="size-3.5 text-primary" />
        <span>{selected.label}</span>
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
        className="w-[320px] rounded-2xl border border-border/60 bg-popover/95 p-3 shadow-xl backdrop-blur-xl"
      >
        <div className="grid grid-cols-2 gap-2">
          {STYLE_OPTIONS.map((option) => (
            <StyleOptionCell
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

function StyleOptionCell({
  option,
  active,
  onClick,
}: {
  option: StyleOption;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-10 items-center justify-center rounded-xl border px-3 text-sm font-medium transition-all",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {option.label}
    </button>
  );
}
