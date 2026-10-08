import type { Prisma } from "@prisma/client";
import { conflict, AppError } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { StockDecimal as D, toBaseQuantity } from "@/domain/stock/quantities";
import {
  orderReserveSchema,
  allocateReservationSchema,
  releaseAllocationSchema,
} from "@/domain/production/validation";
import { balance, checkDate, invalid } from "@/server/stock/movements";
import { requireStockItem } from "@/server/stock/catalog";
import { runProductionCommand } from "./commands";
import { lockProduction } from "./locks";
import { lineContext, executable, orderDTO } from "./orders";
export async function reservationRemaining(
  tx: Prisma.TransactionClient,
  id: string,
) {
  const rows = await tx.stockReservationEvent.findMany({
    where: { reservationId: id },
  });
  return rows.reduce(
    (s, e) =>
      s.plus(new D(e.quantity.toString()).times(e.kind === "RESERVE" ? 1 : -1)),
    new D(0),
  );
}
export async function allocationRemaining(
  tx: Prisma.TransactionClient,
  id: string,
) {
  const rows = await tx.productionReservationEvent.findMany({
    where: { allocationId: id },
  });
  return rows.reduce(
    (s, e) =>
      s.plus(new D(e.quantity.toString()).times(e.kind === "RESERVE" ? 1 : -1)),
    new D(0),
  );
}
export async function allocatedTotal(
  tx: Prisma.TransactionClient,
  reservationId: string,
) {
  const rows = await tx.productionReservationEvent.findMany({
    where: { allocation: { reservationId } },
  });
  return rows.reduce(
    (s, e) =>
      s.plus(new D(e.quantity.toString()).times(e.kind === "RESERVE" ? 1 : -1)),
    new D(0),
  );
}
export async function reserveOrderMaterial(actor: Actor, raw: unknown) {
  const v = orderReserveSchema.parse(raw);
  return runProductionCommand(actor, "ORDER_RESERVE", v, async (tx) => {
    const { order: o, line: l } = await lineContext(tx, v.lineId);
    if (o.version !== v.expectedVersion) throw conflict();
    executable(o.status);
    checkDate(v.effectiveDate, v.reason);
    await lockProduction(tx, { itemIds: [v.itemId] });
    const item = await requireStockItem(tx, v.itemId);
    if (!item.active || !item.inventoriedAt)
      invalid("Material não inventariado ou inativo.");
    const q = new D(
      toBaseQuantity(
        v.quantity,
        item.unit as "G" | "ML" | "UNIT",
        item.unit as "G" | "ML" | "UNIT",
      ),
    );
    if (!q.gt(0)) invalid("Informe quantidade positiva.");
    if (
      new D((await balance(tx, item.id)).available).minus(q).lt(0) &&
      !v.reason
    )
      invalid("Justifique a falta de material.");
    const r = await tx.stockReservation.create({
      data: {
        itemId: item.id,
        productionLineId: l.id,
        events: {
          create: {
            kind: "RESERVE",
            quantity: q.toFixed(),
            actorId: actor.id,
            reason: v.reason ?? "",
          },
        },
      },
    });
    await tx.productionReservationAllocation.create({
      data: {
        lineId: l.id,
        reservationId: r.id,
        events: {
          create: {
            kind: "RESERVE",
            quantity: q.toFixed(),
            actorId: actor.id,
            reason: v.reason ?? "",
          },
        },
      },
    });
    await tx.stockItem.update({
      where: { id: item.id },
      data: { version: { increment: 1 } },
    });
    await tx.productionOrder.update({
      where: { id: o.id },
      data: { version: { increment: 1 } },
    });
    return orderDTO(tx, o.id);
  });
}
export async function allocateSaleReservation(actor: Actor, raw: unknown) {
  const v = allocateReservationSchema.parse(raw);
  return runProductionCommand(
    actor,
    "ORDER_ALLOCATE_RESERVATION",
    v,
    async (tx) => {
      const { order: o, line: l } = await lineContext(tx, v.lineId);
      if (o.version !== v.expectedVersion) throw conflict();
      executable(o.status);
      const pre = await tx.stockReservation.findUnique({
        where: { id: v.reservationId },
      });
      if (!pre) throw new AppError("NOT_FOUND", "Reserva não encontrada.");
      await lockProduction(tx, { itemIds: [pre.itemId] });
      const r = await tx.stockReservation.findUniqueOrThrow({
        where: { id: pre.id },
      });
      if (
        !o.saleId ||
        r.saleId !== o.saleId ||
        r.lineKey !== l.saleLineKey ||
        r.version !== v.reservationVersion
      )
        throw conflict();
      const item = await requireStockItem(tx, r.itemId);
      const q = new D(
        toBaseQuantity(
          v.quantity,
          item.unit as "G" | "ML" | "UNIT",
          item.unit as "G" | "ML" | "UNIT",
        ),
      );
      if (
        !q.gt(0) ||
        q.gt(
          (await reservationRemaining(tx, r.id)).minus(
            await allocatedTotal(tx, r.id),
          ),
        )
      )
        invalid("Quantidade excede a reserva ainda não alocada.");
      const allocation = await tx.productionReservationAllocation.upsert({
        where: { lineId_reservationId: { lineId: l.id, reservationId: r.id } },
        create: { lineId: l.id, reservationId: r.id },
        update: {},
      });
      await tx.productionReservationEvent.create({
        data: {
          allocationId: allocation.id,
          kind: "RESERVE",
          quantity: q.toFixed(),
          actorId: actor.id,
          reason: v.reason ?? "",
        },
      });
      await tx.productionOrder.update({
        where: { id: o.id },
        data: { version: { increment: 1 } },
      });
      return orderDTO(tx, o.id);
    },
  );
}
export async function releaseOrderReservation(actor: Actor, raw: unknown) {
  const v = releaseAllocationSchema.parse(raw);
  return runProductionCommand(
    actor,
    "ORDER_RELEASE_RESERVATION",
    v,
    async (tx) => {
      const a = await tx.productionReservationAllocation.findUnique({
        where: { id: v.allocationId },
        include: { reservation: true },
      });
      if (!a) throw new AppError("NOT_FOUND", "Alocação não encontrada.");
      const { order: o } = await lineContext(tx, a.lineId);
      if (o.version !== v.expectedVersion) throw conflict();
      executable(o.status);
      await lockProduction(tx, { itemIds: [a.reservation.itemId] });
      const q = new D(v.quantity);
      if (!q.gt(0) || q.gt(await allocationRemaining(tx, a.id)))
        invalid("Liberação excede a alocação.");
      const item = await requireStockItem(tx, a.reservation.itemId);
      toBaseQuantity(
        v.quantity,
        item.unit as "G" | "ML" | "UNIT",
        item.unit as "G" | "ML" | "UNIT",
      );
      await tx.productionReservationEvent.create({
        data: {
          allocationId: a.id,
          kind: "RELEASE",
          quantity: v.quantity,
          actorId: actor.id,
          reason: v.reason,
        },
      });
      await tx.stockReservationEvent.create({
        data: {
          reservationId: a.reservationId,
          kind: "RELEASE",
          quantity: v.quantity,
          actorId: actor.id,
          reason: v.reason,
        },
      });
      await tx.stockReservation.update({
        where: { id: a.reservationId },
        data: { version: { increment: 1 } },
      });
      await tx.stockItem.update({
        where: { id: item.id },
        data: { version: { increment: 1 } },
      });
      await tx.productionOrder.update({
        where: { id: o.id },
        data: { version: { increment: 1 } },
      });
      return orderDTO(tx, o.id);
    },
  );
}
