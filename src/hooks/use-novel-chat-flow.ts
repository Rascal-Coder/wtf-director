"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { apiFetch } from "@/lib/api-fetch";
import { expandHomeStory } from "@/services/home/ai-story-expand";
import { updateNovelPromotionRawText } from "@/services/novel-promotion/client";

import type {
  ChatAskOption,
  ChatMsg,
} from "@/app/[locale]/novel-promotion/[projectId]/_components/chat/types";
import type { StreamState } from "./use-story-to-script-stream";

export type CreateMode = "ai-help" | "direct";

export interface UseNovelChatFlowParams {
  projectId: string;
  mode: CreateMode | null;
  rawText: string;
  locale: "zh" | "en";
  streamState: StreamState;
  onStartPipeline: () => void;
}

const GENRE_OPTION_IDS = [
  "xianxia",
  "xuanhuan",
  "urban",
  "guoFeng",
  "sciFi",
  "freeform",
] as const;

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useNovelChatFlow({
  projectId,
  mode,
  rawText,
  locale,
  streamState,
  onStartPipeline,
}: UseNovelChatFlowParams) {
  const t = useTranslations("NovelPromotion.chat");
  const tGenre = useTranslations("NovelPromotion.chat.genre");

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const initRef = useRef(false);
  const lastLogIndexRef = useRef(0);
  const errorPushedRef = useRef(false);

  const pushMessage = useCallback((msg: ChatMsg) => {
    setMessages((prev) => prev.concat(msg));
  }, []);

  const updateMessage = useCallback(
    (id: string, updater: (msg: ChatMsg) => ChatMsg) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
    },
    [],
  );

  // Initialize conversation once when mode + rawText are ready.
  // setState here is intentional: this is a one-shot seeding from async-loaded
  // props (mode + rawText) plus a side effect (onStartPipeline). The initRef
  // guard ensures it runs only once.
  useEffect(() => {
    if (initRef.current) return;
    if (!mode || !rawText) return;
    initRef.current = true;

    const userMsg: ChatMsg = {
      id: uid("u"),
      role: "user",
      kind: "text",
      text: rawText,
    };

    if (mode === "direct") {
      const noticeMsg: ChatMsg = {
        id: uid("a"),
        role: "assistant",
        kind: "text",
        text: t("startNotice"),
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([userMsg, noticeMsg]);
      onStartPipeline();
      return;
    }

    const options: ChatAskOption[] = GENRE_OPTION_IDS.map((id) => ({
      id,
      label: tGenre(id),
    }));
    const askMsg: ChatMsg = {
      id: uid("a"),
      role: "assistant",
      kind: "ask",
      prompt: t("askGenreTitle"),
      options,
    };
    setMessages(() => [userMsg, askMsg]);
  }, [mode, rawText, t, tGenre, onStartPipeline]);

  // Map stream progress (step-level logs) into assistant progress bubbles.
  useEffect(() => {
    const logs = streamState.logs;
    if (logs.length <= lastLogIndexRef.current) return;
    const newLogs = logs.slice(lastLogIndexRef.current);
    lastLogIndexRef.current = logs.length;

    const progressMsgs: ChatMsg[] = newLogs
      .filter((log) => log.level === "step")
      .map((log) => ({
        id: uid("p"),
        role: "assistant" as const,
        kind: "text" as const,
        text: log.message,
        tone: "progress" as const,
      }));

    if (progressMsgs.length > 0) {
      setMessages((prev) => prev.concat(progressMsgs));
    }
  }, [streamState.logs]);

  // Map stream error.
  useEffect(() => {
    if (streamState.phase !== "error" || !streamState.error) return;
    if (errorPushedRef.current) return;
    errorPushedRef.current = true;
    pushMessage({
      id: uid("e"),
      role: "assistant",
      kind: "text",
      text: t("pipelineError", { detail: streamState.error }),
      tone: "error",
    });
  }, [streamState.phase, streamState.error, pushMessage, t]);

  const pick = useCallback(
    async (msgId: string, optionId: string) => {
      const target = messages.find((m) => m.id === msgId);
      if (!target || target.kind !== "ask" || target.pickedId) return;

      const optionLabel =
        target.options.find((o) => o.id === optionId)?.label ?? optionId;

      // Mark ask as picked.
      updateMessage(msgId, (m) =>
        m.kind === "ask" ? { ...m, pickedId: optionId } : m,
      );

      // Push pending expansion assistant bubble.
      const pendingId = uid("a");
      pushMessage({
        id: pendingId,
        role: "assistant",
        kind: "text",
        text: t("expanding", { label: optionLabel }),
        pending: true,
      });

      try {
        const hint =
          optionId === "freeform"
            ? rawText
            : `[${t("genreHintPrefix")}: ${optionLabel}] ${rawText}`;
        const result = await expandHomeStory({
          apiFetch,
          prompt: hint,
          locale,
        });
        updateMessage(pendingId, (m) =>
          m.kind === "text"
            ? { ...m, text: result.expandedText, pending: false }
            : m,
        );
        await updateNovelPromotionRawText({
          apiFetch,
          projectId,
          rawText: result.expandedText,
        });
        pushMessage({
          id: uid("a"),
          role: "assistant",
          kind: "text",
          text: t("startNotice"),
        });
        onStartPipeline();
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        updateMessage(pendingId, (m) =>
          m.kind === "text"
            ? {
                ...m,
                text: t("expandFailed", { detail }),
                pending: false,
                tone: "error",
              }
            : m,
        );
        // Allow retry by clearing the picked id on the ask message.
        updateMessage(msgId, (m) =>
          m.kind === "ask" ? { ...m, pickedId: undefined } : m,
        );
      }
    },
    [
      messages,
      updateMessage,
      pushMessage,
      t,
      rawText,
      locale,
      projectId,
      onStartPipeline,
    ],
  );

  return { messages, pick };
}
