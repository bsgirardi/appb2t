import { z } from "zod";
import Decimal from "decimal.js";
import { planningMeta } from "@/domain/planning/validation";
import { stockQuantity } from "@/domain/stock/validation";
import { conflict } from "@/lib/errors";
import { invalid } from "@/server/stock/movements";
import type { Actor } from "@/server/auth/session";
import { allocationRemaining } from "@/server/production/reservations";
import { batchRow, batchDTO } from "./batch-read";
import { runPlanningCommand } from "./commands";
const schema = z
  .object({
    ...planningMeta,
    batchId: z.string(),
    colorAvailabilityConfirmed: z.boolean(),
    needs: z
      .array(
        z
          .object({ participationId: z.string(), quantity: stockQuantity })
          .strict(),
      )
      .min(1)
      .max(100),
    allocations: z
      .array(
        z
          .object({
            participationId: z.string(),
            allocationId: z.string(),
            quantity: stockQuantity,
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
export type CoverageInput = z.infer<typeof schema>;
export async function setBatchCoverage(actor: Actor, raw: unknown) {
  const v = schema.parse(raw);
  return runPlanningCommand(actor, "BATCH_COVERAGE", v, async (tx) => {
    const b = await batchRow(tx, v.batchId);
    if (b.version !== v.expectedVersion) throw conflict();
    if (!["PENDING", "SCHEDULED"].includes(b.state))
      invalid(
        "Confirme o lote antes de vincular material; execução iniciada não permite alterar previsão.",
      );
    if (
      v.needs.length !== b.participants.length ||
      new Set(v.needs.map((x) => x.participationId)).size !== v.needs.length ||
      v.needs.some(
        (x) =>
          !b.participants.some((p) => p.id === x.participationId) ||
          !new Decimal(x.quantity).gt(0),
      )
    )
      invalid("Informe necessidade positiva para cada participação.");
    await tx.planningMaterialCoverage.deleteMany({
      where: { participation: { batchId: b.id } },
    });
    for (const c of v.allocations) {
      const p = b.participants.find((x) => x.id === c.participationId),
        a = await tx.productionReservationAllocation.findUnique({
          where: { id: c.allocationId },
          include: { reservation: true },
        });
      if (
        !p ||
        !a ||
        a.lineId !== p.lineId ||
        a.reservation.itemId !== b.materialItemId ||
        !new Decimal(c.quantity).gt(0)
      )
        invalid("Parcela de reserva incompatível.");
      const used = await tx.planningMaterialCoverage.aggregate({
        where: {
          allocationId: c.allocationId,
          participation: {
            batch: { state: { notIn: ["CANCELED", "CLOSED", "DRAFT"] } },
          },
        },
        _sum: { quantity: true },
      });
      if (
        (await allocationRemaining(tx, c.allocationId))
          .minus(used._sum.quantity?.toString() ?? 0)
          .lt(c.quantity)
      )
        invalid("Parcela já coberta por outro lote ou insuficiente.");
      await tx.planningMaterialCoverage.create({ data: c });
    }
    for (const n of v.needs)
      await tx.planningParticipation.update({
        where: { id: n.participationId },
        data: { needQuantity: n.quantity },
      });
    await tx.planningBatch.update({
      where: { id: b.id },
      data: {
        colorAvailabilityConfirmed: v.colorAvailabilityConfirmed,
        state: "PENDING",
        version: { increment: 1 },
      },
    });
    return batchDTO(tx, b.id);
  });
}
