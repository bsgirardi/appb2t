import type { Actor } from "@/server/auth/session";
import type { BatchDTO } from "@/domain/planning/types";
import { z } from "zod";
import { planningMeta } from "@/domain/planning/validation";
import { conflict } from "@/lib/errors";
import { runPlanningCommand } from "./commands";
import { batchRow, batchDTO } from "./batch-read";
import { linkReportTx, reconcilePlanningTx } from "./invariants";
import { invalid } from "@/server/stock/movements";
import { stockQuantity } from "@/domain/stock/validation";
import { outstandingCoverage } from "./coverage";
import Decimal from "decimal.js";
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
const releaseSchema = z
  .object({
    ...planningMeta,
    batchId: z.string(),
    reason: z.string().trim().min(3),
    releases: z
      .array(
        z.object({ participationId: z.string(), units: units.min(1) }).strict(),
      )
      .max(100),
    materialReleases: z
      .array(
        z.object({ coverageId: z.string(), quantity: stockQuantity }).strict(),
      )
      .max(100),
  })
  .strict();
export async function releaseBatchRemainder(
  actor: Actor,
  raw: unknown,
): Promise<BatchDTO> {
  const v = releaseSchema.parse(raw);
  return runPlanningCommand(actor, "BATCH_RELEASE_REMAINDER", v, async (tx) => {
    const b = await batchRow(tx, v.batchId);
    if (b.version !== v.expectedVersion) throw conflict();
    if (b.state !== "CLOSED")
      invalid("Conclua a retirada antes de conciliar sobras.");
    if (
      (!v.releases.length && !v.materialReleases.length) ||
      new Set(v.releases.map((x) => x.participationId)).size !==
        v.releases.length ||
      new Set(v.materialReleases.map((x) => x.coverageId)).size !==
        v.materialReleases.length
    )
      invalid("Informe cada sobra uma única vez.");
    for (const r of v.releases) {
      const p = b.participants.find((p) => p.id === r.participationId);
      if (!p || r.units > p.units - p.settledUnits - p.releasedUnits)
        invalid("Liberação excede peças sem conciliação.");
      await tx.planningParticipation.update({
        where: { id: r.participationId },
        data: { releasedUnits: { increment: r.units } },
      });
    }
    for (const r of v.materialReleases) {
      const c = b.participants
        .flatMap((p) => p.coverage)
        .find((c) => c.id === r.coverageId);
      if (!c || !new Decimal(r.quantity).gt(0)) invalid("Cobertura inválida.");
      const outstanding = (await outstandingCoverage(tx, c!.allocationId)).find(
        (x) => x.id === c!.id,
      );
      if (!outstanding || new Decimal(r.quantity).gt(outstanding.quantity))
        invalid("Liberação excede material sem conciliação.");
      await tx.planningMaterialCoverage.update({
        where: { id: r.coverageId },
        data: { releasedQuantity: { increment: r.quantity } },
      });
    }
    await tx.planningBatch.update({
      where: { id: b.id },
      data: { version: { increment: 1 } },
    });
    return batchDTO(tx, b.id);
  });
}
