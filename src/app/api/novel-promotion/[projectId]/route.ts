import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

interface PatchBody {
  rawText?: string;
}

function safeParse<T>(input: string | null): T | null {
  if (!input) return null;
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await ctx.params;

  const project = await prisma.novelPromotionProject.findUnique({
    where: { id: projectId },
    include: {
      episodes: {
        orderBy: { index: "asc" },
        include: {
          clips: { orderBy: { index: "asc" } },
          characters: true,
          locations: true,
          props: true,
          runs: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "project not found" },
      { status: 404 },
    );
  }

  const episode = project.episodes[0];
  const latestRun = episode?.runs[0] ?? null;

  return NextResponse.json({
    project: {
      id: project.id,
      title: project.title,
      ratio: project.ratio,
      artStyle: project.artStyle,
      createdAt: project.createdAt,
    },
    episode: episode
      ? {
          id: episode.id,
          rawText: episode.rawText,
          status: episode.status,
          charactersIntroduction: episode.charactersIntroduction,
          characters: episode.characters,
          locations: episode.locations,
          props: episode.props,
          clips: episode.clips.map((c) => ({
            id: c.id,
            index: c.index,
            startText: c.startText,
            endText: c.endText,
            content: c.content,
            location: c.location,
            characters: safeParse<string[]>(c.characters) ?? [],
            props: safeParse<string[]>(c.props) ?? [],
            matchLevel: c.matchLevel,
            screenplay: safeParse(c.screenplay),
          })),
        }
      : null,
    latestRun: latestRun
      ? {
          id: latestRun.id,
          status: latestRun.status,
          progress: latestRun.progress,
          step: latestRun.step,
          error: latestRun.error,
          result: safeParse(latestRun.result),
        }
      : null,
  });
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as PatchBody;

  const rawText = typeof body.rawText === "string" ? body.rawText.trim() : "";
  if (!rawText) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "rawText is required" },
      { status: 400 },
    );
  }

  const project = await prisma.novelPromotionProject.findUnique({
    where: { id: projectId },
    include: { episodes: { orderBy: { index: "asc" }, take: 1 } },
  });

  if (!project || !project.episodes[0]) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "project or episode not found" },
      { status: 404 },
    );
  }

  const episode = project.episodes[0];

  const running = await prisma.workflowRun.findFirst({
    where: {
      episodeId: episode.id,
      type: "story_to_script_run",
      status: { in: ["queued", "running"] },
    },
  });
  if (running) {
    return NextResponse.json(
      { error: "RUN_IN_PROGRESS", message: "pipeline already running" },
      { status: 409 },
    );
  }

  await prisma.novelPromotionEpisode.update({
    where: { id: episode.id },
    data: { rawText },
  });

  return NextResponse.json({ ok: true, episodeId: episode.id });
}
