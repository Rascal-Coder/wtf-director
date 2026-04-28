"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type CompositionEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";
import { resolveTextareaTargetHeight } from "@/lib/ui/textarea-height";

export interface StoryInputComposerOption {
  value: string;
  label: string;
  recommended?: boolean;
}

interface StoryInputComposerProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  minRows: number;
  disabled?: boolean;
  /** 最大高度占视口的比例，默认 0.5。 */
  maxHeightViewportRatio?: number;
  /** 输入区右上角的辅助插槽（如字数统计）。 */
  topRight?: ReactNode;
  /** 操作行左侧的下拉选择器（比例 / 风格 / 预设）。 */
  selectors?: ReactNode;
  /** 操作行右侧的次级动作（如「AI 帮我写」）。 */
  secondaryActions?: ReactNode;
  /** 操作行右侧的主动作（必填）。 */
  primaryAction: ReactNode;
  /** 卡片底部说明文案（可选）。 */
  footer?: ReactNode;
  onCompositionStart?: () => void;
  onCompositionEnd?: (event: CompositionEvent<HTMLTextAreaElement>) => void;
  textareaClassName?: string;
  className?: string;
}

export function StoryInputComposer({
  value,
  onValueChange,
  placeholder,
  minRows,
  disabled = false,
  maxHeightViewportRatio = 0.5,
  topRight,
  selectors,
  secondaryActions,
  primaryAction,
  footer,
  onCompositionStart,
  onCompositionEnd,
  textareaClassName,
  className,
}: StoryInputComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaMinHeightRef = useRef<number | null>(null);

  const autoResizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el || typeof window === "undefined") return;

    const maxHeight = window.innerHeight * maxHeightViewportRatio;
    const oldHeight = el.offsetHeight;
    const oldScrollTop = el.scrollTop;

    if (textareaMinHeightRef.current === null && oldHeight > 0) {
      textareaMinHeightRef.current = oldHeight;
    }

    const minHeight = textareaMinHeightRef.current ?? oldHeight;

    el.style.transition = "none";
    el.style.height = "auto";
    const scrollHeight = el.scrollHeight;
    const targetHeight = resolveTextareaTargetHeight({
      minHeight,
      maxHeight,
      scrollHeight,
    });
    el.style.height = `${oldHeight}px`;
    el.scrollTop = oldScrollTop;

    requestAnimationFrame(() => {
      el.scrollTop = oldScrollTop;
      el.style.transition = "height 200ms ease-out";
      el.style.height = `${targetHeight}px`;
      el.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
    });
  }, [maxHeightViewportRatio]);

  useEffect(() => {
    autoResizeTextarea();
  }, [value, autoResizeTextarea]);

  return (
    <div
      className={cn(
        "relative w-full rounded-3xl bg-card px-2 py-5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.08)] ring-1 ring-foreground/5",
        className,
      )}
    >
      <div className="px-4">
        {topRight && (
          <div className="mb-3 flex items-center justify-end">{topRight}</div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          placeholder={placeholder}
          rows={minRows}
          disabled={disabled}
          className={cn(
            "w-full resize-none border-0 bg-transparent px-0 py-0 text-[15px] leading-7 text-foreground outline-none placeholder:text-muted-foreground/80 disabled:cursor-not-allowed disabled:opacity-50",
            textareaClassName,
          )}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-4 pb-1">
        <div className="flex min-w-0 items-center gap-2">{selectors}</div>
        <div className="ml-auto flex items-center gap-2">
          {secondaryActions}
          {primaryAction}
        </div>
      </div>

      {footer && <div className="px-4 pt-3 pb-1">{footer}</div>}
    </div>
  );
}

export default StoryInputComposer;
