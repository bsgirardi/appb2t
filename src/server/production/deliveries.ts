import type { Prisma } from "@prisma/client";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import {
  deliverySchema,
  deliveryCorrectionSchema,
} from "@/domain/production/validation";
import { civilDateToDb } from "@/domain/commerce/dates";
import { checkDate, invalid } from "@/server/stock/movements";
import { runProductionCommand } from "./commands";
import { lockProduction } from "./locks";
import { activeSale } from "./orders";
import { commitmentRemaining, projectSale } from "./fulfillment";
import { reservationRemaining } from "./reservations";
export async function deliveryDTO(tx: Prisma.TransactionClient, id: string) {
  const d = await tx.productionDelivery.findUniqueOrThrow({
    where: { id },
    include: { lines: true },
  });
  return {
    ...d,
    effectiveDate: d.effectiveDate.toISOString().slice(0, 10),
    createdAt: d.createdAt.toISOString(),
  };
}
export async function assertFinalDelivery(
  tx: Prisma.TransactionClient,
  saleId: string,
) {
  const sale = await tx.sale.findUniqueOrThrow({
    where: { id: saleId },
    include: { items: true },
  });
  let final = true;
  for (const i of sale.items) {
    const delivered =
      (
        await tx.productionDeliveryLine.aggregate({
          where: { delivery: { saleId }, lineKey: i.lineKey ?? "" },
          _sum: { units: true },
        })
      )._sum.units ?? 0;
    if (delivered > i.quantity) invalid("Entrega excede quantidade vendida.");
    if (delivered !== i.quantity) final = false;
  }
  if (!final) return;
  const reservations = await tx.stockReservation.findMany({
    where: { OR: [{ saleId }, { productionLine: { order: { saleId } } }] },
  });
  for (const r of reservations)
    if ((await reservationRemaining(tx, r.id)).gt(0))
      invalid("Resolva as reservas de material antes da entrega final.");
  const lines = await tx.productionLine.findMany({
    where: { order: { saleId, status: { notIn: ["RASCUNHO", "CANCELADA"] } } },
    include: { events: true },
  });
  for (const l of lines)
    if (
      l.targetUnits >
      l.events.reduce((s, e) => s + e.goodUnits + e.canceledUnits, 0)
    )
      invalid("Resolva as metas pendentes antes da entrega final.");
}
export async function recordDelivery(actor: Actor, raw: unknown) {
  const v = deliverySchema.parse(raw);
  return runProductionCommand(actor, "DELIVERY", v, (tx) =>
    recordDeliveryWithClient(tx, actor, v),
  );
}
export async function recordDeliveryWithClient(
  tx: Prisma.TransactionClient,
  actor: Actor,
  v: ReturnType<typeof deliverySchema.parse>,
) {
  await lockProduction(tx, { saleIds: [v.saleId] });
  const sale = await activeSale(tx, v.saleId);
  if (sale.version !== v.expectedVersion) throw conflict();
  checkDate(v.effectiveDate, v.reason);
  const ids = v.lines.flatMap((l) => l.allocations.map((a) => a.commitmentId));
  if (new Set(ids).size !== ids.length)
    invalid("Compromisso repetido na entrega.");
  const cs = await tx.finishedCommitment.findMany({
    where: { id: { in: ids } },
    include: { origin: true },
  });
  if (cs.length !== ids.length) invalid("Compromisso não encontrado.");
  await lockProduction(tx, { finishedIds: cs.map((c) => c.origin.stockId) });
  const d = await tx.productionDelivery.create({
    data: {
      saleId: v.saleId,
      actorId: actor.id,
      effectiveDate: civilDateToDb(v.effectiveDate),
      notes: v.notes,
    },
  });
  for (const l of v.lines)
    for (const a of l.allocations) {
      const c = cs.find((c) => c.id === a.commitmentId)!;
      if (c.saleId !== v.saleId || c.lineKey !== l.lineKey)
        invalid("Peças de outra venda ou linha.");
      if (a.units > (await commitmentRemaining(tx, c.id)))
        invalid("Entrega excede peças comprometidas.");
      const m = await tx.finishedMovement.create({
        data: {
          originId: c.originId,
          kind: "DELIVERY",
          units: -a.units,
          actorId: actor.id,
          effectiveDate: d.effectiveDate,
          reason: v.reason ?? "",
        },
      });
      await tx.finishedCommitmentEvent.create({
        data: {
          commitmentId: c.id,
          kind: "DELIVER",
          units: -a.units,
          actorId: actor.id,
        },
      });
      await tx.productionDeliveryLine.create({
        data: {
          deliveryId: d.id,
          lineKey: l.lineKey,
          commitmentId: c.id,
          units: a.units,
          movementId: m.id,
        },
      });
    }
  for (const id of new Set(cs.map((c) => c.origin.stockId)))
    await tx.finishedStock.update({
      where: { id },
      data: { version: { increment: 1 } },
    });
  await assertFinalDelivery(tx, v.saleId);
  await projectSale(tx, v.saleId);
  return deliveryDTO(tx, d.id);
}
export async function correctDelivery(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const v = deliveryCorrectionSchema.parse(raw);
  return runProductionCommand(actor, "DELIVERY_CORRECT", v, async (tx) => {
    const pre = await tx.productionDelivery.findUnique({
      where: { id: v.deliveryId },
      include: {
        lines: { include: { commitment: { include: { origin: true } } } },
      },
    });
    if (!pre) throw new AppError("NOT_FOUND", "Entrega não encontrada.");
    await lockProduction(tx, {
      saleIds: [pre.saleId],
      finishedIds: pre.lines.map((l) => l.commitment.origin.stockId),
    });
    const original = await tx.productionDelivery.findUniqueOrThrow({
      where: { id: pre.id },
    });
    if (original.version !== v.expectedVersion || original.sourceId)
      throw conflict();
    checkDate(v.effectiveDate, v.reason);
    if (new Set(v.lines.map((l) => l.deliveryLineId)).size !== v.lines.length)
      invalid("Linha repetida.");
    const correction = await tx.productionDelivery.create({
      data: {
        saleId: pre.saleId,
        sourceId: pre.id,
        actorId: actor.id,
        effectiveDate: civilDateToDb(v.effectiveDate),
        notes: v.reason,
      },
    });
    for (const l of v.lines) {
      const old = pre.lines.find((x) => x.id === l.deliveryLineId);
      if (!old) invalid("Linha não pertence à entrega.");
      const reversed = await tx.productionDeliveryLine.aggregate({
        where: { sourceLineId: l.deliveryLineId },
        _sum: { units: true },
      });
      if (l.units > old!.units + (reversed._sum.units ?? 0))
        invalid("Correção excede entrega líquida.");
      const m = await tx.finishedMovement.create({
        data: {
          originId: old!.commitment.originId,
          kind: "UNDO_DELIVERY",
          units: l.units,
          sourceId: old!.movementId,
          actorId: actor.id,
          reason: v.reason,
          effectiveDate: correction.effectiveDate,
        },
      });
      await tx.finishedCommitmentEvent.create({
        data: {
          commitmentId: old!.commitmentId,
          kind: "UNDO_DELIVERY",
          units: l.units,
          actorId: actor.id,
          reason: v.reason,
        },
      });
      await tx.productionDeliveryLine.create({
        data: {
          deliveryId: correction.id,
          lineKey: old!.lineKey,
          commitmentId: old!.commitmentId,
          units: -l.units,
          movementId: m.id,
          sourceLineId: old!.id,
        },
      });
    }
    await tx.productionDelivery.update({
      where: { id: pre.id },
      data: { version: { increment: 1 } },
    });
    for (const id of new Set(pre.lines.map((l) => l.commitment.origin.stockId)))
      await tx.finishedStock.update({
        where: { id },
        data: { version: { increment: 1 } },
      });
    await projectSale(tx, pre.saleId);
    return deliveryDTO(tx, correction.id);
  });
}
