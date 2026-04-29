import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrisma() {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
