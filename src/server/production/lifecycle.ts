import type { Prisma } from "@prisma/client";
import { conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import {
  orderActionSchema,
  cancelRemainderSchema,
} from "@/domain/production/validation";
import { todaySaoPaulo, civilDateToDb } from "@/domain/commerce/dates";
import { invalid } from "@/server/stock/movements";
import { runProductionCommand } from "./commands";
import { lockProduction } from "./locks";
import { lockOrder, orderDTO, executable } from "./orders";
import { allocationRemaining } from "./reservations";
import { commitmentRemaining, projectSale } from "./fulfillment";
import { originBalance } from "./finished-stock";
export async function completeOrder(actor: Actor, raw: unknown) {
  const v = orderActionSchema.parse(raw);
  return runProductionCommand(actor, "ORDER_COMPLETE", v, async (tx) => {
    const o = await lockOrder(tx, v.orderId);
    if (o.version !== v.expectedVersion) throw conflict();
    executable(o.status);
    for (const l of o.lines) {
      if (
        l.targetUnits !==
        l.events.reduce((n, e) => n + e.goodUnits + e.canceledUnits, 0)
      )
        invalid("Ainda há peças a produzir.");
      const allocations = await tx.productionReservationAllocation.findMany({
        where: { lineId: l.id },
      });
      for (const a of allocations)
        if ((await allocationRemaining(tx, a.id)).gt(0))
          invalid("Consuma ou libere as reservas da ordem.");
      await tx.productionEvent.create({
        data: {
          lineId: l.id,
          kind: "COMPLETE",
          actorId: actor.id,
          effectiveDate: civilDateToDb(todaySaoPaulo(new Date())),
        },
      });
    }
    await tx.productionOrder.update({
      where: { id: o.id },
      data: { status: "CONCLUIDA", version: { increment: 1 } },
    });
    if (o.saleId) await projectSale(tx, o.saleId);
    return orderDTO(tx, o.id);
  });
}
export async function cancelOrderRemainder(actor: Actor, raw: unknown) {
  const v = cancelRemainderSchema.parse(raw);
  return runProductionCommand(
    actor,
    "ORDER_CANCEL_REMAINDER",
    v,
    async (tx) => {
      const o = await lockOrder(tx, v.orderId);
      if (
        o.version !== v.expectedVersion ||
        ["CANCELADA", "CONCLUIDA"].includes(o.status)
      )
        throw conflict();
      if (o.lines.some((l) => l.events.some((e) => e.kind === "REPORT")))
        assertAdmin(actor);
      if (new Set(v.lines.map((l) => l.lineId)).size !== v.lines.length)
        invalid("Linha repetida.");
      const origins = await tx.finishedOrigin.findMany({
        where: { lineId: { in: v.lines.map((l) => l.lineId) } },
        include: { stock: true, commitments: true },
      });
      const allocations = await tx.productionReservationAllocation.findMany({
        where: { lineId: { in: v.lines.map((l) => l.lineId) } },
        include: { reservation: true },
      });
      await lockProduction(tx, {
        finishedIds: origins.map((x) => x.stockId),
        itemIds: allocations.map((a) => a.reservation.itemId),
      });
      const now = civilDateToDb(todaySaoPaulo(new Date()));
      for (const input of v.lines) {
        const l = o.lines.find((l) => l.id === input.lineId);
        if (!l) invalid("Linha de outra ordem.");
        const pending =
          l!.targetUnits -
          l!.events.reduce((n, e) => n + e.goodUnits + e.canceledUnits, 0);
        if (input.unitsToCancel > pending)
          invalid("Cancelamento excede meta restante.");
        if (
          new Set(input.dispositions.map((d) => d.originId)).size !==
          input.dispositions.length
        )
          invalid("Origem repetida.");
        for (const origin of origins.filter((x) => x.lineId === l!.id)) {
          const state = await originBalance(tx, origin.id);
          const d = input.dispositions.find((d) => d.originId === origin.id);
          if (
            Number(state.physical) > 0 &&
            (!d || d.units !== Number(state.physical))
          )
            invalid("Informe a destinação de todas as peças restantes.");
          if (!d) continue;
          if (d.action === "KEEP_SALE") {
            if (!o.saleId || Number(state.reserved) !== d.units)
              invalid(
                "Manter para venda exige compromisso integral da própria ordem.",
              );
            continue;
          }
          if (d.action === "RELEASE_STOCK" && !origin.stock.productId)
            invalid("Peça avulsa não pode virar estoque de produto.");
          for (const c of origin.commitments) {
            const q = await commitmentRemaining(tx, c.id);
            if (q) {
              if (c.saleId !== o.saleId)
                invalid(
                  "Resolva o compromisso de outra venda antes de cancelar.",
                );
              await tx.finishedCommitmentEvent.create({
                data: {
                  commitmentId: c.id,
                  kind: "RELEASE",
                  units: -q,
                  actorId: actor.id,
                  reason: v.reason,
                },
              });
            }
          }
          if (d.action === "LOSS")
            await tx.finishedMovement.create({
              data: {
                originId: origin.id,
                kind: "LOSS",
                units: -d.units,
                actorId: actor.id,
                reason: v.reason,
                effectiveDate: now,
              },
            });
        }
        if (
          input.dispositions.some(
            (d) =>
              !origins.some((x) => x.id === d.originId && x.lineId === l!.id),
          )
        )
          invalid("Destinação de outra linha.");
        await tx.productionEvent.create({
          data: {
            lineId: l!.id,
            kind: "CLOSE_REMAINDER",
            canceledUnits: input.unitsToCancel,
            actorId: actor.id,
            reason: v.reason,
            effectiveDate: now,
          },
        });
        for (const a of allocations.filter((a) => a.lineId === l!.id)) {
          const q = await allocationRemaining(tx, a.id);
          if (q.gt(0)) {
            await tx.productionReservationEvent.create({
              data: {
                allocationId: a.id,
                kind: "RELEASE",
                quantity: q.toFixed(),
                actorId: actor.id,
                reason: v.reason,
              },
            });
            await tx.stockReservationEvent.create({
              data: {
                reservationId: a.reservationId,
                kind: "RELEASE",
                quantity: q.toFixed(),
                actorId: actor.id,
                reason: v.reason,
              },
            });
            await tx.stockReservation.update({
              where: { id: a.reservationId },
              data: { version: { increment: 1 } },
            });
            await tx.stockItem.update({
              where: { id: a.reservation.itemId },
              data: { version: { increment: 1 } },
            });
          }
        }
      }
      for (const id of new Set(origins.map((o) => o.stockId)))
        await tx.finishedStock.update({
          where: { id },
          data: { version: { increment: 1 } },
        });
      const result = await orderDTO(tx, o.id);
      const done = result.lines.every(
        (l) => l.goodUnits + l.canceledUnits === l.targetUnits,
      );
      await tx.productionOrder.update({
        where: { id: o.id },
        data: {
          status: done ? "CANCELADA" : o.status,
          version: { increment: 1 },
        },
      });
      if (o.saleId) await projectSale(tx, o.saleId);
      return orderDTO(tx, o.id);
    },
  );
}
export async function prepareSaleProductionCancellation(
  tx: Prisma.TransactionClient,
  _actor: Actor,
  saleId: string,
) {
  const sale = await tx.sale.findUniqueOrThrow({ where: { id: saleId } });
  if (sale.fulfillmentMode !== "U3") return;
  const orders = await tx.productionOrder.findMany({ where: { saleId } });
  await lockProduction(tx, { orderIds: orders.map((o) => o.id) });
  if (orders.some((o) => !["CONCLUIDA", "CANCELADA"].includes(o.status)))
    invalid("Encerre ou cancele as ordens antes de cancelar a venda.");
  const delivered = await tx.productionDeliveryLine.aggregate({
    where: { delivery: { saleId } },
    _sum: { units: true },
  });
  if ((delivered._sum.units ?? 0) > 0)
    invalid("Venda com entrega efetiva não pode ser cancelada.");
  const reserved = await tx.finishedCommitmentEvent.aggregate({
    where: { commitment: { saleId } },
    _sum: { units: true },
  });
  if ((reserved._sum.units ?? 0) > 0)
    invalid("Defina a destinação das peças antes de cancelar a venda.");
}
