import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

interface CreateProjectBody {
  rawText?: string;
  title?: string;
  ratio?: string;
  artStyle?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as CreateProjectBody;
  const rawText = (body.rawText ?? "").trim();
  if (!rawText) {
    return NextResponse.json(
      { error: "INVALID_PARAMS", message: "rawText is required" },
      { status: 400 },
    );
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 80)
      : rawText.slice(0, 24).replace(/\s+/g, " ");

  const projectId = nanoid();
  const episodeId = nanoid();

  const project = await prisma.novelPromotionProject.create({
    data: {
      id: projectId,
      title,
      ratio: typeof body.ratio === "string" ? body.ratio : null,
      artStyle: typeof body.artStyle === "string" ? body.artStyle : null,
      episodes: {
        create: {
          id: episodeId,
          index: 0,
          rawText,
        },
      },
    },
    include: { episodes: true },
  });

  return NextResponse.json({
    projectId: project.id,
    episodeId,
    title: project.title,
  });
}
