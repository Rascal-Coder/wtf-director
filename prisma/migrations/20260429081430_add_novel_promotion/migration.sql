-- CreateTable
CREATE TABLE "NovelPromotionProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "ratio" TEXT,
    "artStyle" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NovelPromotionEpisode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "index" INTEGER NOT NULL DEFAULT 0,
    "rawText" TEXT NOT NULL,
    "charactersIntroduction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NovelPromotionEpisode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "NovelPromotionProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NovelPromotionCharacter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "libName" TEXT NOT NULL,
    "description" TEXT,
    "attributes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NovelPromotionCharacter_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "NovelPromotionEpisode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NovelPromotionLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "libName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NovelPromotionLocation_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "NovelPromotionEpisode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NovelPromotionProp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "libName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NovelPromotionProp_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "NovelPromotionEpisode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NovelPromotionClip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "startText" TEXT NOT NULL,
    "endText" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "location" TEXT,
    "characters" TEXT,
    "props" TEXT,
    "matchLevel" TEXT,
    "screenplay" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NovelPromotionClip_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "NovelPromotionEpisode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "step" TEXT,
    "error" TEXT,
    "result" TEXT,
    "leaseUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkflowRun_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "NovelPromotionEpisode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LLMTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "output" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LLMTask_runId_fkey" FOREIGN KEY ("runId") REFERENCES "WorkflowRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Artifact_runId_fkey" FOREIGN KEY ("runId") REFERENCES "WorkflowRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NovelPromotionEpisode_projectId_idx" ON "NovelPromotionEpisode"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "NovelPromotionCharacter_episodeId_libName_key" ON "NovelPromotionCharacter"("episodeId", "libName");

-- CreateIndex
CREATE UNIQUE INDEX "NovelPromotionLocation_episodeId_libName_key" ON "NovelPromotionLocation"("episodeId", "libName");

-- CreateIndex
CREATE UNIQUE INDEX "NovelPromotionProp_episodeId_libName_key" ON "NovelPromotionProp"("episodeId", "libName");

-- CreateIndex
CREATE UNIQUE INDEX "NovelPromotionClip_episodeId_index_key" ON "NovelPromotionClip"("episodeId", "index");

-- CreateIndex
CREATE INDEX "WorkflowRun_episodeId_type_idx" ON "WorkflowRun"("episodeId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "LLMTask_dedupeKey_key" ON "LLMTask"("dedupeKey");

-- CreateIndex
CREATE INDEX "Artifact_runId_kind_idx" ON "Artifact"("runId", "kind");
