import { prisma } from "@/lib/db/prisma";

const LEASE_DURATION_MS = 5 * 60 * 1000;

/**
 * 简化版 lease：原子地把一个 queued/失效 run 抢成 running。
 * 真生产 (BullMQ + 多 worker) 时会被 Redis 锁替换，这里先用 DB 层避免重复跑。
 */
export async function acquireRunLease(runId: string): Promise<boolean> {
  const now = new Date();
  const result = await prisma.workflowRun.updateMany({
    where: {
      id: runId,
      OR: [
        { status: "queued" },
        { leaseUntil: null },
        { leaseUntil: { lt: now } },
      ],
    },
    data: {
      status: "running",
      leaseUntil: new Date(now.getTime() + LEASE_DURATION_MS),
    },
  });
  return result.count === 1;
}

export async function renewLease(runId: string) {
  await prisma.workflowRun.update({
    where: { id: runId },
    data: { leaseUntil: new Date(Date.now() + LEASE_DURATION_MS) },
  });
}

export async function releaseLease(runId: string, finalStatus: "done" | "failed") {
  await prisma.workflowRun.update({
    where: { id: runId },
    data: { leaseUntil: null, status: finalStatus },
  });
}

export async function withWorkflowRunLease<T>(
  runId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const ok = await acquireRunLease(runId);
  if (!ok) {
    throw new Error(`Run ${runId} is already running or finished`);
  }
  const interval = setInterval(() => {
    renewLease(runId).catch(() => undefined);
  }, LEASE_DURATION_MS / 2);

  try {
    const result = await fn();
    return result;
  } finally {
    clearInterval(interval);
  }
}
