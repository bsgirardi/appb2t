import type { Actor } from "@/server/auth/session";
import type { BatchDTO } from "@/domain/planning/types";
import { z } from "zod";
import { batchSchema, planningMeta } from "@/domain/planning/validation";
import { conflict } from "@/lib/errors";
import { invalid } from "@/server/stock/movements";
import { runPlanningCommand } from "./commands";
import { batchRow, batchDTO, unclaimed } from "./batch-read";
import { lockProduction } from "@/server/production/locks";
import { operationalEstimates } from "./estimates";
export const batchAction = z
  .object({ ...planningMeta, batchId: z.string().min(1) })
  .strict();
export async function saveBatch(actor: Actor, raw: unknown): Promise<BatchDTO> {
  const v = batchSchema.parse(raw);
  return runPlanningCommand(actor, "BATCH_SAVE", v, async (tx) => {
    const old = v.id ? await batchRow(tx, v.id) : null;
    if ((old?.version ?? 0) !== v.expectedVersion) throw conflict();
    if (old && !["DRAFT", "PENDING", "SCHEDULED"].includes(old.state))
      invalid("Lote iniciado não permite alterar composição.");
    const printer = await tx.printer.findUnique({ where: { id: v.printerId } });
    if (!printer?.active) invalid("Máquina indisponível.");
    const lines = await tx.productionLine.findMany({
      where: { id: { in: v.participants.map((p) => p.lineId) } },
      include: { order: true },
    });
    if (
      lines.length !== v.participants.length ||
      lines.some(
        (l) =>
          l.plannedPrinterId !== v.printerId ||
          l.technology !== printer!.technology ||
          !["LIBERADA", "EM_EXECUCAO"].includes(l.order.status),
      )
    )
      invalid("Confira ordens e máquina planejada no U3.");
    await lockProduction(tx, {
      saleIds: lines.flatMap((l) => (l.order.saleId ? [l.order.saleId] : [])),
      orderIds: lines.map((l) => l.orderId),
      itemIds: [v.materialItemId],
    });
    if (old && old.state !== "DRAFT")
      for (const p of v.participants)
        if (p.units > (await unclaimed(tx, p.lineId, old.id)))
          invalid("Quantidade excede o saldo sem lote.");
    const signature = (xs: { lineId: string; units: number }[]) =>
      JSON.stringify(
        [...xs]
          .sort((a, b) => a.lineId.localeCompare(b.lineId))
          .map((p) => [p.lineId, p.units]),
      );
    const changed =
      !!old &&
      (old.printerId !== v.printerId ||
        old.materialItemId !== v.materialItemId ||
        old.colorKey !== v.colorLabel.toLocaleLowerCase("pt-BR") ||
        signature(old.participants) !== signature(v.participants) ||
        old.profileConfirmed !== v.profileConfirmed ||
        old.fitConfirmed !== v.fitConfirmed);
    const data = {
      printerId: v.printerId,
      materialItemId: v.materialItemId,
      colorLabel: v.colorLabel,
      colorKey: v.colorLabel.toLocaleLowerCase("pt-BR"),
      profileConfirmed: v.profileConfirmed,
      fitConfirmed: v.fitConfirmed,
      durationMinutes: v.durationMinutes,
      durationConfirmedAt:
        !changed && v.durationConfirmed && Number(v.durationMinutes) > 0
          ? new Date()
          : null,
      prepareMinutes: v.prepareMinutes,
      removeMinutes: v.removeMinutes,
    };
    const b = old
      ? await tx.planningBatch.update({
          where: { id: old.id },
          data: {
            ...data,
            version: { increment: 1 },
            state: old.state === "DRAFT" ? "DRAFT" : "PENDING",
            ...(changed ? { colorAvailabilityConfirmed: false } : {}),
          },
        })
      : await tx.planningBatch.create({ data });
    const removed =
      old?.participants.filter(
        (p) => !v.participants.some((x) => x.lineId === p.lineId),
      ) ?? [];
    if (changed || removed.length)
      await tx.planningMaterialCoverage.deleteMany({
        where: { participation: { batchId: b.id } },
      });
    if (removed.length)
      await tx.planningParticipation.deleteMany({
        where: { id: { in: removed.map((p) => p.id) } },
      });
    for (const p of v.participants)
      await tx.planningParticipation.upsert({
        where: { batchId_lineId: { batchId: b.id, lineId: p.lineId } },
        create: { batchId: b.id, ...p },
        update: { units: p.units, ...(changed ? { needQuantity: 0 } : {}) },
      });
    await tx.planningBatch.update({
      where: { id: b.id },
      data: {
        estimateReference: await operationalEstimates(tx, v.participants),
      },
    });
    return batchDTO(tx, b.id);
  });
}
export async function confirmBatch(
  actor: Actor,
  raw: unknown,
): Promise<BatchDTO> {
  const v = batchAction.parse(raw);
  return runPlanningCommand(actor, "BATCH_CONFIRM", v, async (tx) => {
    const b = await batchRow(tx, v.batchId);
    if (b.version !== v.expectedVersion || b.state !== "DRAFT")
      throw conflict();
    for (const p of b.participants)
      if (p.units > (await unclaimed(tx, p.lineId)))
        invalid("Quantidade excede o saldo sem lote.");
    const position =
      (
        await tx.planningBatch.aggregate({
          where: { printerId: b.printerId },
          _max: { position: true },
        })
      )._max.position ?? 0;
    await tx.planningBatch.update({
      where: { id: b.id },
      data: {
        state: "PENDING",
        position: position + 1,
        version: { increment: 1 },
      },
    });
    return batchDTO(tx, b.id);
  });
}
export async function scheduleBatch(
  actor: Actor,
  raw: unknown,
): Promise<BatchDTO> {
  const v = batchAction.parse(raw);
  return runPlanningCommand(actor, "BATCH_SCHEDULE", v, async (tx) => {
    const b = await batchDTO(tx, v.batchId);
    if (b.version !== v.expectedVersion || b.state !== "PENDING")
      throw conflict();
    if (b.blockers.length) invalid(b.blockers.join(". "));
    for (const p of b.participants)
      if (p.units > (await unclaimed(tx, p.lineId, b.id)))
        invalid("Demanda alterada; revise o lote.");
    await tx.planningBatch.update({
      where: { id: b.id },
      data: { state: "SCHEDULED", version: { increment: 1 } },
    });
    return batchDTO(tx, b.id);
  });
}
