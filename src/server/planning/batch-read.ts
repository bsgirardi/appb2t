import type { Prisma } from "@prisma/client";
import type { BatchDTO } from "@/domain/planning/types";
import { AppError } from "@/lib/errors";
import { allocationRemaining } from "@/server/production/reservations";
import { balance } from "@/server/stock/movements";
import Decimal from "decimal.js";
import {
  batchIssues,
  type BatchIssueFact,
  type IssueCode,
} from "@/domain/planning/issues";
import { coveredTotal, outstandingCoverage } from "./coverage";
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
    facts: BatchIssueFact[] = [];
  const add = (code: IssueCode, lineId?: string) =>
    facts.push({
      code,
      kind: lineId ? "line" : "batch",
      id: lineId ?? b.id,
      target:
        code === "MACHINE_INACTIVE"
          ? { kind: "printer", id: b.printerId }
          : ["MATERIAL_INACTIVE", "STOCK"].includes(code)
            ? { kind: "material", id: b.materialItemId }
            : code === "ORDER_MACHINE"
              ? {
                  kind: "order",
                  id:
                    b.participants.find((p) => p.lineId === lineId)?.line
                      .orderId ?? "",
                }
              : {
                  kind: ["DURATION", "PROFILE_FIT"].includes(code)
                    ? "batch-edit"
                    : "batch",
                  id: b.id,
                },
    });
  if (!b.printer.active) add("MACHINE_INACTIVE");
  if (!b.material.active || !b.material.inventoriedAt) add("MATERIAL_INACTIVE");
  if (!b.colorAvailabilityConfirmed) add("COLOR");
  if (!b.durationConfirmedAt || !b.durationMinutes?.gt(0)) add("DURATION");
  if (!b.profileConfirmed || !b.fitConfirmed) add("PROFILE_FIT");
  const stock = await balance(tx, b.materialItemId);
  if (new Decimal(stock.available).lt(0)) add("STOCK");
  for (const p of b.participants) {
    if (
      p.line.plannedPrinterId !== b.printerId ||
      p.line.technology !== b.printer.technology ||
      !["LIBERADA", "EM_EXECUCAO"].includes(p.line.order.status)
    )
      add("ORDER_MACHINE", p.lineId);
    const covered = p.coverage.reduce(
      (n, c) => n.plus(c.quantity.toString()),
      new Decimal(0),
    );
    if (!p.needQuantity.gt(0) || covered.lt(p.needQuantity.toString()))
      add("RESERVATION", p.lineId);
    for (const c of p.coverage) {
      const used = await coveredTotal(tx, c.allocationId);
      if ((await allocationRemaining(tx, c.allocationId)).lt(used))
        add("COVERAGE_CHANGED", p.lineId);
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
      releasedUnits: p.releasedUnits,
      needQuantity: p.needQuantity.toFixed(),
      dueDate: p.line.order.dueDate?.toISOString().slice(0, 10) ?? null,
      responsibleId: p.line.order.responsibleId,
      description: p.line.description,
      orderSequence: p.line.order.sequence,
    })),
    coverage: await Promise.all(
      b.participants.flatMap((p) =>
        p.coverage.map(async (c) => ({
          id: c.id,
          participationId: p.id,
          allocationId: c.allocationId,
          quantity: c.quantity.toFixed(),
          releasedQuantity: c.releasedQuantity.toFixed(),
          outstandingQuantity:
            (await outstandingCoverage(tx, c.allocationId)).find(
              (x) => x.id === c.id,
            )?.quantity ?? "0",
        })),
      ),
    ),
    milestones: b.milestones.map((m) => ({
      id: m.id,
      kind: m.kind,
      instant: m.instant.toISOString(),
      sourceId: m.sourceId,
      reason: m.reason,
    })),
    issues: batchIssues(facts),
    blockers: [...new Set(batchIssues(facts).map((i) => i.message))],
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
    claims.reduce((n, p) => n + p.units - p.settledUnits - p.releasedUnits, 0)
  );
}
