import type { Prisma } from "@prisma/client";
import { invalid } from "@/server/stock/movements";
import { batchDTO, unclaimed } from "./batch-read";
export async function linkReportTx(
  tx: Prisma.TransactionClient,
  input: {
    participationId: string;
    eventId: string;
    goodUnits: number;
    failedUnits: number;
  },
) {
  const p = await tx.planningParticipation.findUniqueOrThrow({
    where: { id: input.participationId },
    include: { batch: true },
  });
  const event = await tx.productionEvent.findUniqueOrThrow({
    where: { id: input.eventId },
    include: { corrections: true },
  });
  if (
    event.lineId !== p.lineId ||
    event.kind !== "REPORT" ||
    !["PREPARING", "PRINTING", "AWAITING_REMOVAL", "CLOSED"].includes(
      p.batch.state,
    ) ||
    event.printerId !== p.batch.printerId
  )
    invalid("Apontamento incompatível com a participação executada.");
  if (input.goodUnits + input.failedUnits <= 0)
    invalid("Informe unidades efetivas para conciliar.");
  const other = await tx.planningReportLink.findMany({
    where: { eventId: event.id, participationId: { not: p.id } },
  });
  const netGood =
      event.goodUnits + event.corrections.reduce((n, e) => n + e.goodUnits, 0),
    netFailed =
      event.failedUnits +
      event.corrections.reduce((n, e) => n + e.failedUnits, 0);
  if (
    input.goodUnits + other.reduce((n, x) => n + x.goodUnits, 0) > netGood ||
    input.failedUnits + other.reduce((n, x) => n + x.failedUnits, 0) > netFailed
  )
    invalid("Unidades excedem o apontamento líquido disponível.");
  const previous = await tx.planningReportLink.findMany({
    where: { participationId: p.id, eventId: { not: event.id } },
  });
  if (
    input.goodUnits +
      input.failedUnits +
      previous.reduce((n, x) => n + x.goodUnits + x.failedUnits, 0) >
    p.units
  )
    invalid("Unidades excedem a participação no lote.");
  await tx.planningReportLink.upsert({
    where: {
      participationId_eventId: { participationId: p.id, eventId: event.id },
    },
    create: input,
    update: { goodUnits: input.goodUnits, failedUnits: input.failedUnits },
  });
}
export async function reconcilePlanningTx(
  tx: Prisma.TransactionClient,
  _context?: { lineIds: string[]; reservationIds: string[] },
): Promise<void> {
  const batches = await tx.planningBatch.findMany({
    where: { state: { notIn: ["DRAFT", "CANCELED"] } },
    include: {
      participants: {
        include: {
          line: true,
          reports: { include: { event: { include: { corrections: true } } } },
        },
      },
    },
  });
  for (const b of batches) {
    for (const p of b.participants) {
      let settled = 0;
      for (const link of p.reports) {
        const e = link.event,
          good = Math.max(
            0,
            e.goodUnits + e.corrections.reduce((n, c) => n + c.goodUnits, 0),
          ),
          failed = Math.max(
            0,
            e.failedUnits +
              e.corrections.reduce((n, c) => n + c.failedUnits, 0),
          );
        // Every report belongs to one line; deterministic allocation caps corrected results across links.
        const prior = await tx.planningReportLink.findMany({
          where: { eventId: e.id, id: { lt: link.id } },
        });
        settled +=
          Math.max(
            0,
            Math.min(
              link.goodUnits,
              good - prior.reduce((n, x) => n + x.goodUnits, 0),
            ),
          ) +
          Math.max(
            0,
            Math.min(
              link.failedUnits,
              failed - prior.reduce((n, x) => n + x.failedUnits, 0),
            ),
          );
      }
      if (p.settledUnits !== settled)
        await tx.planningParticipation.update({
          where: { id: p.id },
          data: { settledUnits: settled },
        });
    }
    for (const p of b.participants)
      if ((await unclaimed(tx, p.lineId)) < 0)
        invalid(
          "A alteração afeta peças alocadas em lotes. Concilie o apontamento com sua participação ou cancele os lotes futuros antes de reduzir a meta.",
        );
    const dto = await batchDTO(tx, b.id),
      future = ["PENDING", "SCHEDULED"].includes(b.state);
    const wrongMachine = b.participants.some(
      (p) => p.line.plannedPrinterId !== b.printerId,
    );
    if (future && (dto.blockers.length || wrongMachine))
      await tx.planningBatch.update({
        where: { id: b.id },
        data: {
          state: "PENDING",
          ...(wrongMachine ? { durationConfirmedAt: null } : {}),
          version: { increment: 1 },
        },
      });
  }
}
