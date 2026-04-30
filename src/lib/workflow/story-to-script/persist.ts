import { nanoid } from "nanoid";

import { prisma } from "@/lib/db/prisma";

import type {
  CharacterEntry,
  ClipEntry,
  LocationEntry,
  PropEntry,
  ScreenplayResult,
} from "./types";

export async function persistAnalysis(args: {
  episodeId: string;
  characters: CharacterEntry[];
  locations: LocationEntry[];
  props: PropEntry[];
  charactersIntroduction: string;
}) {
  const { episodeId, characters, locations, props, charactersIntroduction } = args;

  await prisma.$transaction(async (tx) => {
    if (characters.length > 0) {
      const existing = await tx.novelPromotionCharacter.findMany({
        where: { episodeId, libName: { in: characters.map((c) => c.libName) } },
        select: { libName: true },
      });
      const seen = new Set(existing.map((e) => e.libName));
      const toCreate = characters.filter((c) => !seen.has(c.libName));
      if (toCreate.length > 0) {
        await tx.novelPromotionCharacter.createMany({
          data: toCreate.map((c) => ({
            id: nanoid(),
            episodeId,
            libName: c.libName,
            description: c.description ?? null,
            attributes: c.aliases ? JSON.stringify({ aliases: c.aliases }) : null,
          })),
        });
      }
    }

    if (locations.length > 0) {
      const existing = await tx.novelPromotionLocation.findMany({
        where: { episodeId, libName: { in: locations.map((l) => l.libName) } },
        select: { libName: true },
      });
      const seen = new Set(existing.map((e) => e.libName));
      const toCreate = locations.filter((l) => !seen.has(l.libName));
      if (toCreate.length > 0) {
        await tx.novelPromotionLocation.createMany({
          data: toCreate.map((l) => ({
            id: nanoid(),
            episodeId,
            libName: l.libName,
            description: l.description ?? null,
          })),
        });
      }
    }

    if (props.length > 0) {
      const existing = await tx.novelPromotionProp.findMany({
        where: { episodeId, libName: { in: props.map((p) => p.libName) } },
        select: { libName: true },
      });
      const seen = new Set(existing.map((e) => e.libName));
      const toCreate = props.filter((p) => !seen.has(p.libName));
      if (toCreate.length > 0) {
        await tx.novelPromotionProp.createMany({
          data: toCreate.map((p) => ({
            id: nanoid(),
            episodeId,
            libName: p.libName,
            description: p.description ?? null,
          })),
        });
      }
    }

    await tx.novelPromotionEpisode.update({
      where: { id: episodeId },
      data: { charactersIntroduction },
    });
  });
}

export async function persistClipsAndScreenplay(args: {
  episodeId: string;
  clips: ClipEntry[];
  screenplays: ScreenplayResult[];
}) {
  const { episodeId, clips, screenplays } = args;
  const screenplayByClipId = new Map(screenplays.map((s) => [s.clipId, s]));

  await prisma.$transaction(async (tx) => {
    await tx.novelPromotionClip.deleteMany({ where: { episodeId } });

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const sp = screenplayByClipId.get(clip.id);
      await tx.novelPromotionClip.create({
        data: {
          id: nanoid(),
          episodeId,
          index: i,
          startText: clip.startText,
          endText: clip.endText,
          content: clip.content,
          location: clip.location ?? null,
          characters: clip.characters.length
            ? JSON.stringify(clip.characters)
            : null,
          props: clip.props.length ? JSON.stringify(clip.props) : null,
          matchLevel: clip.matchLevel,
          screenplay:
            sp?.screenplay && sp.success
              ? JSON.stringify(sp.screenplay)
              : null,
        },
      });
    }
  });
}

export async function createArtifact(args: {
  runId: string;
  kind: string;
  refId?: string;
  payload: unknown;
}) {
  return prisma.artifact.create({
    data: {
      id: nanoid(),
      runId: args.runId,
      kind: args.kind,
      refId: args.refId ?? null,
      payload: JSON.stringify(args.payload),
    },
  });
}

export function buildCharactersIntroduction(
  characters: CharacterEntry[],
): string {
  return characters
    .map((c) => {
      const desc = c.description ? `：${c.description}` : "";
      const aliases =
        c.aliases && c.aliases.length > 0 ? `（别名：${c.aliases.join("、")}）` : "";
      return `- ${c.libName}${aliases}${desc}`;
    })
    .join("\n");
}
