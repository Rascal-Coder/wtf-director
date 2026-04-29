import { completeChatJson } from "@/lib/ai/json";
import type { ChatStreamHandler } from "@/lib/ai/openai-compatible";
import {
  type PromptLocale,
  renderChatPromptWithVars,
} from "@/lib/ai/prompts";

import { createClipContentMatcher } from "../clip-matcher";

import type {
  CharacterEntry,
  ClipEntry,
  LocationEntry,
  PropEntry,
  ScreenplayResult,
} from "./types";

const CATEGORY = "novel-promotion";

export async function analyzeCharacters(
  rawText: string,
  locale: PromptLocale,
  onDelta?: ChatStreamHandler,
): Promise<CharacterEntry[]> {
  const { system, user } = await renderChatPromptWithVars(
    CATEGORY,
    "analyze_characters",
    locale,
    rawText,
  );
  const { parsed } = await completeChatJson<{ characters?: CharacterEntry[] }>(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    {
      onDelta,
      validate: (v) =>
        !!v && typeof v === "object" && Array.isArray((v as { characters?: unknown }).characters),
    },
  );
  return (parsed.characters ?? []).filter(
    (c): c is CharacterEntry =>
      typeof c?.libName === "string" && c.libName.trim().length > 0,
  );
}

export async function analyzeLocations(
  rawText: string,
  locale: PromptLocale,
  onDelta?: ChatStreamHandler,
): Promise<LocationEntry[]> {
  const { system, user } = await renderChatPromptWithVars(
    CATEGORY,
    "analyze_locations",
    locale,
    rawText,
  );
  const { parsed } = await completeChatJson<{ locations?: LocationEntry[] }>(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    {
      onDelta,
      validate: (v) =>
        !!v && typeof v === "object" && Array.isArray((v as { locations?: unknown }).locations),
    },
  );
  return (parsed.locations ?? []).filter(
    (l): l is LocationEntry =>
      typeof l?.libName === "string" && l.libName.trim().length > 0,
  );
}

export async function analyzeProps(
  rawText: string,
  locale: PromptLocale,
  onDelta?: ChatStreamHandler,
): Promise<PropEntry[]> {
  const { system, user } = await renderChatPromptWithVars(
    CATEGORY,
    "analyze_props",
    locale,
    rawText,
  );
  const { parsed } = await completeChatJson<{ props?: PropEntry[] }>(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    {
      onDelta,
      validate: (v) =>
        !!v && typeof v === "object" && Array.isArray((v as { props?: unknown }).props),
    },
  );
  return (parsed.props ?? []).filter(
    (p): p is PropEntry =>
      typeof p?.libName === "string" && p.libName.trim().length > 0,
  );
}

interface RawClip {
  id?: string;
  startText?: string;
  endText?: string;
  summary?: string;
  location?: string;
  characters?: string[];
  props?: string[];
}

function summarizeLibsForPrompt(input: {
  characters: CharacterEntry[];
  locations: LocationEntry[];
  props: PropEntry[];
}): string {
  const lines: string[] = [];
  lines.push("characters:");
  for (const c of input.characters) {
    lines.push(`  - ${c.libName}${c.description ? `: ${c.description}` : ""}`);
  }
  lines.push("locations:");
  for (const l of input.locations) {
    lines.push(`  - ${l.libName}${l.description ? `: ${l.description}` : ""}`);
  }
  lines.push("props:");
  for (const p of input.props) {
    lines.push(`  - ${p.libName}${p.description ? `: ${p.description}` : ""}`);
  }
  return lines.join("\n");
}

export async function splitClips(args: {
  rawText: string;
  locale: PromptLocale;
  characters: CharacterEntry[];
  locations: LocationEntry[];
  props: PropEntry[];
  onDelta?: ChatStreamHandler;
}): Promise<ClipEntry[]> {
  const { rawText, locale, characters, locations, props, onDelta } = args;

  const { system, user } = await renderChatPromptWithVars(
    CATEGORY,
    "split_clips",
    locale,
    rawText,
    { libs: summarizeLibsForPrompt({ characters, locations, props }) },
  );

  const { parsed } = await completeChatJson<{ clips?: RawClip[] }>(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    {
      onDelta,
      validate: (v) =>
        !!v && typeof v === "object" && Array.isArray((v as { clips?: unknown }).clips),
    },
  );

  const matcher = createClipContentMatcher(rawText);
  const seenIds = new Set<string>();
  const out: ClipEntry[] = [];

  let cursor = 0;
  for (let i = 0; i < (parsed.clips ?? []).length; i++) {
    const raw = parsed.clips![i];
    if (
      typeof raw.startText !== "string" ||
      typeof raw.endText !== "string" ||
      raw.startText.trim().length < 4 ||
      raw.endText.trim().length < 4
    ) {
      continue;
    }
    const matched = matcher.match(raw.startText.trim(), raw.endText.trim(), cursor);
    if (!matched || matched.start < cursor) continue;

    let id = (raw.id ?? `clip_${i + 1}`).trim() || `clip_${i + 1}`;
    while (seenIds.has(id)) id = `${id}_${Math.random().toString(36).slice(2, 5)}`;
    seenIds.add(id);

    out.push({
      id,
      startText: raw.startText.trim(),
      endText: raw.endText.trim(),
      content: matched.content,
      summary: raw.summary,
      location: raw.location,
      characters: Array.isArray(raw.characters)
        ? raw.characters.filter((s) => typeof s === "string")
        : [],
      props: Array.isArray(raw.props)
        ? raw.props.filter((s) => typeof s === "string")
        : [],
      matchLevel: matched.level,
      startIndex: matched.start,
      endIndex: matched.end,
    });
    cursor = matched.end;
  }

  return out;
}

export async function convertClipToScreenplay(args: {
  clip: ClipEntry;
  locale: PromptLocale;
  onDelta?: ChatStreamHandler;
}): Promise<ScreenplayResult> {
  const { clip, locale, onDelta } = args;
  try {
    const { system, user } = await renderChatPromptWithVars(
      CATEGORY,
      "screenplay_conversion",
      locale,
      clip.content,
      {
        location: clip.location ?? "",
        characters: clip.characters.join(", "),
        props: clip.props.join(", "),
      },
    );

    const { parsed } = await completeChatJson<{
      scenes?: Array<{
        sceneNo?: number;
        shot?: string;
        duration?: number | string;
        visual?: string;
        dialogue?: string;
        sfx?: string;
      }>;
    }>(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      {
        onDelta,
        validate: (v) =>
          !!v && typeof v === "object" && Array.isArray((v as { scenes?: unknown }).scenes),
      },
    );

    const scenes = (parsed.scenes ?? [])
      .map((s, idx) => ({
        sceneNo: typeof s.sceneNo === "number" ? s.sceneNo : idx + 1,
        shot: typeof s.shot === "string" ? s.shot : "中景",
        duration:
          typeof s.duration === "number"
            ? s.duration
            : typeof s.duration === "string"
              ? s.duration
              : 4,
        visual: typeof s.visual === "string" ? s.visual : "",
        dialogue: typeof s.dialogue === "string" ? s.dialogue : "",
        sfx: typeof s.sfx === "string" ? s.sfx : "",
      }))
      .filter((s) => s.visual.trim().length > 0);

    return {
      clipId: clip.id,
      success: scenes.length > 0,
      sceneCount: scenes.length,
      screenplay: { scenes },
    };
  } catch (e) {
    return {
      clipId: clip.id,
      success: false,
      sceneCount: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
