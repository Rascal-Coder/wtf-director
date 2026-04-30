"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { ChatMessage } from "./chat-message";
import type { ChatMsg } from "./types";

interface ChatPanelProps {
  messages: ChatMsg[];
  onPick?: (msgId: string, optionId: string) => void;
  className?: string;
}

export function ChatPanel({ messages, onPick, className }: ChatPanelProps) {
  const t = useTranslations("NovelPromotion.chat");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <span className="size-2 rounded-full bg-primary/70" />
        <span className="text-sm font-medium text-foreground">
          {t("header")}
        </span>
      </div>

      <div
        ref={listRef}
        className="flex-1 min-h-0 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} onPick={onPick} />
        ))}
      </div>

      <div className="border-t border-border/60 px-4 py-3">
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground/70">
          <span className="truncate">{t("inputPlaceholder")}</span>
        </div>
      </div>
    </aside>
  );
}
