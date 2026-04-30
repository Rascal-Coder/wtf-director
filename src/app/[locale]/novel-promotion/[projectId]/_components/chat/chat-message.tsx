"use client";

import { AppIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

import { ChatAskCard } from "./chat-ask-card";
import type { ChatMsg } from "./types";

interface ChatMessageProps {
  msg: ChatMsg;
  onPick?: (msgId: string, optionId: string) => void;
}

export function ChatMessage({ msg, onPick }: ChatMessageProps) {
  if (msg.kind === "ask") {
    return (
      <div className="flex w-full justify-start">
        <div className="max-w-[92%]">
          <ChatAskCard
            prompt={msg.prompt}
            options={msg.options}
            pickedId={msg.pickedId}
            onPick={(optId) => onPick?.(msg.id, optId)}
          />
        </div>
      </div>
    );
  }

  const isUser = msg.role === "user";
  const tone = msg.tone ?? "default";

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] whitespace-pre-wrap wrap-break-word rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-primary/15 text-foreground"
            : "bg-muted/50 text-foreground",
          tone === "progress" && "bg-muted/30 text-muted-foreground",
          tone === "error" && "border border-destructive/40 bg-destructive/10 text-destructive",
        )}
      >
        {msg.pending ? (
          <span className="inline-flex items-center gap-2">
            <AppIcon name="loader" className="size-3.5 animate-spin" />
            <span>{msg.text}</span>
          </span>
        ) : (
          msg.text
        )}
      </div>
    </div>
  );
}
