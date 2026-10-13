import type { Prisma } from "@prisma/client";
import type { BatchDTO } from "@/domain/planning/types";
import { AppError } from "@/lib/errors";
import { allocationRemaining } from "@/server/production/reservations";
import { balance } from "@/server/stock/movements";
import Decimal from "decimal.js";
export async function batchRow(tx: Prisma.TransactionClient, id: string) {
  const row = await tx.planningBatch.findUnique({
    where: { id },
    include: {
      printer: true,
      material: true,
      participants: {
        include: {
          line: { include: { order: true, events: true } },
          coverage: true,
        },
      },
      milestones: { orderBy: { instant: "asc" } },
    },
  });
  if (!row) throw new AppError("NOT_FOUND", "Lote não encontrado.");
  return row;
}
export async function batchDTO(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<BatchDTO> {
  const b = await batchRow(tx, id),
    blockers: string[] = [];
  if (!b.printer.active) blockers.push("Máquina inativa");
  if (!b.material.active || !b.material.inventoriedAt)
    blockers.push("Material não inventariado ou inativo");
  if (!b.colorAvailabilityConfirmed)
    blockers.push("Confirme a disponibilidade da cor manualmente");
  if (!b.durationConfirmedAt || !b.durationMinutes?.gt(0))
    blockers.push("Confirme o tempo do fatiador");
  if (!b.profileConfirmed || !b.fitConfirmed)
    blockers.push("Confirme perfil e encaixe na mesa");
  const stock = await balance(tx, b.materialItemId);
  if (new Decimal(stock.available).lt(0))
    blockers.push("Material insuficiente para as reservas existentes");
  for (const p of b.participants) {
    if (
      p.line.plannedPrinterId !== b.printerId ||
      p.line.technology !== b.printer.technology ||
      !["LIBERADA", "EM_EXECUCAO"].includes(p.line.order.status)
    )
      blockers.push("Revise a ordem ou máquina planejada");
    const covered = p.coverage.reduce(
      (n, c) => n.plus(c.quantity.toString()),
      new Decimal(0),
    );
    if (!p.needQuantity.gt(0) || covered.lt(p.needQuantity.toString()))
      blockers.push("Reserva insuficiente para o lote");
    for (const c of p.coverage) {
      const used = await tx.planningMaterialCoverage.aggregate({
        where: {
          allocationId: c.allocationId,
          participation: {
            batch: { state: { notIn: ["DRAFT", "CANCELED", "CLOSED"] } },
          },
        },
        _sum: { quantity: true },
      });
      if (
        (await allocationRemaining(tx, c.allocationId)).lt(
          used._sum.quantity?.toString() ?? 0,
        )
      )
        blockers.push("Reserva alterada; revise a cobertura");
    }
  }
  return {
    estimates: (b.estimateReference ?? []) as BatchDTO["estimates"],
    id: b.id,
    version: b.version,
    sequence: b.sequence,
    printerId: b.printerId,
    state: b.state,
    position: b.position,
    materialItemId: b.materialItemId,
    colorLabel: b.colorLabel,
    colorKey: b.colorKey,
    profileConfirmed: b.profileConfirmed,
    fitConfirmed: b.fitConfirmed,
    colorAvailabilityConfirmed: b.colorAvailabilityConfirmed,
    durationMinutes: b.durationMinutes?.toFixed() ?? null,
    durationConfirmedAt: b.durationConfirmedAt?.toISOString() ?? null,
    prepareMinutes: b.prepareMinutes.toFixed(),
    removeMinutes: b.removeMinutes.toFixed(),
    remainingMinutes: b.remainingMinutes?.toFixed() ?? null,
    remainingAsOf: b.remainingAsOf?.toISOString() ?? null,
    participants: b.participants.map((p) => ({
      id: p.id,
      lineId: p.lineId,
      units: p.units,
      settledUnits: p.settledUnits,
      needQuantity: p.needQuantity.toFixed(),
      dueDate: p.line.order.dueDate?.toISOString().slice(0, 10) ?? null,
      responsibleId: p.line.order.responsibleId,
      description: p.line.description,
      orderSequence: p.line.order.sequence,
    })),
    coverage: b.participants.flatMap((p) =>
      p.coverage.map((c) => ({
        id: c.id,
        participationId: p.id,
        allocationId: c.allocationId,
        quantity: c.quantity.toFixed(),
      })),
    ),
    milestones: b.milestones.map((m) => ({
      id: m.id,
      kind: m.kind,
      instant: m.instant.toISOString(),
      sourceId: m.sourceId,
    })),
    blockers: [...new Set(blockers)],
  };
}
export async function unclaimed(
  tx: Prisma.TransactionClient,
  lineId: string,
  excludeBatchId?: string,
) {
  const line = await tx.productionLine.findUniqueOrThrow({
    where: { id: lineId },
    include: { events: true },
  });
  const claims = await tx.planningParticipation.findMany({
    where: {
      lineId,
      batchId: excludeBatchId ? { not: excludeBatchId } : undefined,
      batch: { state: { notIn: ["DRAFT", "CANCELED"] } },
    },
  });
  return (
    line.targetUnits -
    line.events.reduce((n, e) => n + e.goodUnits + e.canceledUnits, 0) -
    claims.reduce((n, p) => n + p.units - p.settledUnits, 0)
  );
}
