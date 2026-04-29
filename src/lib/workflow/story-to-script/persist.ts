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
    for (const c of characters) {
      const exist = await tx.novelPromotionCharacter.findUnique({
        where: { episodeId_libName: { episodeId, libName: c.libName } },
      });
      if (!exist) {
        await tx.novelPromotionCharacter.create({
          data: {
            id: nanoid(),
            episodeId,
            libName: c.libName,
            description: c.description ?? null,
            attributes: c.aliases ? JSON.stringify({ aliases: c.aliases }) : null,
          },
        });
      }
    }

    for (const l of locations) {
      const exist = await tx.novelPromotionLocation.findUnique({
        where: { episodeId_libName: { episodeId, libName: l.libName } },
      });
      if (!exist) {
        await tx.novelPromotionLocation.create({
          data: {
            id: nanoid(),
            episodeId,
            libName: l.libName,
            description: l.description ?? null,
          },
        });
      }
    }

    for (const p of props) {
      const exist = await tx.novelPromotionProp.findUnique({
        where: { episodeId_libName: { episodeId, libName: p.libName } },
      });
      if (!exist) {
        await tx.novelPromotionProp.create({
          data: {
            id: nanoid(),
            episodeId,
            libName: p.libName,
            description: p.description ?? null,
          },
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
