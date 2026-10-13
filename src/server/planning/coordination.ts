import type { Prisma } from "@prisma/client";
export async function lockPlanning(
  tx: Prisma.TransactionClient,
): Promise<number> {
  await tx.$executeRaw`INSERT INTO "PlanningState" (id,revision) VALUES (1,0) ON CONFLICT (id) DO NOTHING`;
  const [row] = await tx.$queryRaw<
    { revision: number }[]
  >`SELECT revision FROM "PlanningState" WHERE id=1 FOR UPDATE`;
  return row.revision;
}
