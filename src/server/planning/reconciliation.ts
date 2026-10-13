import type { Actor } from "@/server/auth/session";
import type { BatchDTO } from "@/domain/planning/types";
import { z } from "zod";
import { planningMeta } from "@/domain/planning/validation";
import { conflict } from "@/lib/errors";
import { runPlanningCommand } from "./commands";
import { batchRow, batchDTO } from "./batch-read";
import { linkReportTx, reconcilePlanningTx } from "./invariants";
const units = z.number().int().min(0).max(2147483647);
const schema = z
  .object({
    ...planningMeta,
    batchId: z.string(),
    reason: z.string().trim().min(3),
    links: z
      .array(
        z
          .object({
            participationId: z.string(),
            eventId: z.string(),
            goodUnits: units,
            failedUnits: units,
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export type ReconcileInput = z.infer<typeof schema>;
export async function reconcileBatch(
  actor: Actor,
  raw: unknown,
): Promise<BatchDTO> {
  const v = schema.parse(raw);
  return runPlanningCommand(actor, "BATCH_RECONCILE", v, async (tx) => {
    const b = await batchRow(tx, v.batchId);
    if (
      b.version !== v.expectedVersion ||
      v.links.some(
        (l) => !b.participants.some((p) => p.id === l.participationId),
      )
    )
      throw conflict();
    for (const link of v.links) await linkReportTx(tx, link);
    await reconcilePlanningTx(tx);
    await tx.planningBatch.update({
      where: { id: b.id },
      data: { version: { increment: 1 } },
    });
    return batchDTO(tx, b.id);
  });
}
