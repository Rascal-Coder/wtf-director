"use client";

import { Sparkles } from "lucide-react";

import {
  Dialog,
  DialogBackdrop,
  DialogPopup,
  DialogPortal,
} from "@/components/animate-ui/primitives/base/dialog";
import { Button } from "@/components/animate-ui/components/buttons/button";

export interface LongTextDetectionPromptCopy {
  title: string;
  description: string;
  strongRecommend: string;
  smartSplitLabel: string;
  smartSplitBadge: string;
  continueLabel: string;
  continueHint: string;
}

interface LongTextDetectionPromptProps {
  open: boolean;
  copy: LongTextDetectionPromptCopy;
  onClose: () => void;
  onSmartSplit: () => void;
  onContinue: () => void;
}

export function LongTextDetectionPrompt({
  open,
  copy,
  onClose,
  onSmartSplit,
  onContinue,
}: LongTextDetectionPromptProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogPortal>
        <DialogBackdrop className="fixed inset-0 z-[110] bg-foreground/30 backdrop-blur-sm" />
        <DialogPopup
          className="fixed top-1/2 left-1/2 z-[120] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] ring-1 ring-foreground/10 outline-none"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 via-violet-500/15 to-blue-500/15">
                <Sparkles className="size-5 text-violet-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{copy.title}</h3>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {copy.description}
            </p>

            <div className="rounded-xl bg-gradient-to-br from-indigo-500/8 via-violet-500/8 to-blue-500/8 p-4 text-sm leading-relaxed">
              <p className="bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 bg-clip-text font-semibold text-transparent">
                {copy.strongRecommend}
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-1">
              <Button
                type="button"
                onClick={onSmartSplit}
                className="flex h-auto w-full items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 py-6 text-base font-semibold text-white shadow-[0_12px_30px_-12px_rgba(99,102,241,0.6)] hover:opacity-95"
              >
                <Sparkles className="size-5" />
                <span>{copy.smartSplitLabel}</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {copy.smartSplitBadge}
                </span>
              </Button>

              <button
                type="button"
                onClick={onContinue}
                className="w-full py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {copy.continueLabel}
                <span className="ml-1 text-xs opacity-60">
                  - {copy.continueHint}
                </span>
              </button>
            </div>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}

export default LongTextDetectionPrompt;
