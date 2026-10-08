import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { conflict, AppError } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { lockCommerce } from "@/server/commerce/locks";
import {
  reserveSchema,
  consumeSchema,
  releaseSchema,
} from "@/domain/stock/validation";
import { StockDecimal as D, toBaseQuantity } from "@/domain/stock/quantities";
import { runStockCommand, lockStockItems } from "./commands";
import { requireStockItem } from "./catalog";
import { balance, checkDate, invalid, postMovement } from "./movements";
async function remaining(tx: Prisma.TransactionClient, id: string) {
  const rows = await tx.stockReservationEvent.findMany({
    where: { reservationId: id },
  });
  return rows.reduce(
    (n, e) =>
      n.plus(new D(e.quantity.toString()).times(e.kind === "RESERVE" ? 1 : -1)),
    new D(0),
  );
}
async function reservable(
  tx: Prisma.TransactionClient,
  id: string,
  consumption = false,
) {
  const sale = await tx.sale.findUnique({ where: { id } });
  if (
    !sale ||
    !["CONFIRMADA", "EM_PRODUCAO", ...(consumption ? ["PRONTA"] : [])].includes(
      sale.status,
    )
  )
    invalid("Venda não permite novas reservas ou consumo.");
  return sale;
}
export async function reserveStock(actor: Actor, raw: unknown) {
  const v = reserveSchema.parse(raw);
  return runStockCommand(actor, "RESERVE", v, async (tx) => {
    checkDate(v.effectiveDate, v.reason);
    await lockCommerce(tx, { saleId: v.saleId });
    await reservable(tx, v.saleId);
    await lockStockItems(tx, [v.itemId]);
    const item = await requireStockItem(tx, v.itemId);
    if (!item.active || !item.inventoriedAt)
      invalid("Item não disponível para reserva.");
    if (item.version !== v.expectedVersion) throw conflict();
    if (
      !(await tx.saleItem.findFirst({
        where: { saleId: v.saleId, lineKey: v.lineKey },
      }))
    )
      invalid("Item da venda não encontrado.");
    const q = new D(
      toBaseQuantity(
        v.quantity,
        item.unit as "G" | "ML" | "UNIT",
        item.unit as "G" | "ML" | "UNIT",
      ),
    );
    if (!q.gt(0)) invalid("Quantidade deve ser positiva.");
    const state = await balance(tx, item.id);
    if (new D(state.available).minus(q).lt(0) && !v.reason)
      invalid("Justifique a falta de material para a reserva.");
    const r = await tx.stockReservation.create({
      data: {
        itemId: item.id,
        saleId: v.saleId,
        lineKey: v.lineKey,
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
    return {
      id: r.id,
      version: r.version,
      itemId: item.id,
      saleId: v.saleId,
      lineKey: v.lineKey,
      remaining: q.toFixed(),
    };
  });
}
export async function consumeStock(actor: Actor, raw: unknown) {
  const v = consumeSchema.parse(raw);
  const pre = await db.stockReservation.findUnique({
    where: { id: v.reservationId },
  });
  if (!pre) throw new AppError("NOT_FOUND", "Reserva não encontrada.");
  if (!pre.saleId)
    invalid("Use o apontamento da ordem para consumir esta reserva.");
  const saleId = pre.saleId ?? invalid("Reserva sem venda.");
  return runStockCommand(actor, "CONSUME", v, async (tx) => {
    checkDate(v.effectiveDate, v.reason);
    await lockCommerce(tx, { saleId });
    await reservable(tx, saleId, true);
    await lockStockItems(tx, [pre.itemId]);
    const reservation = await tx.stockReservation.findUniqueOrThrow({
      where: { id: pre.id },
    });
    if (reservation.version !== v.expectedVersion) throw conflict();
    const open = await remaining(tx, pre.id),
      q = new D(v.quantity);
    if (!q.gt(0)) invalid("Quantidade deve ser positiva.");
    if (q.gt(open) && !v.allowExcess)
      invalid("Confirme consumo acima da reserva.");
    const before = await balance(tx, pre.itemId),
      released = D.min(q, open);
    const item = await requireStockItem(tx, pre.itemId);
    const event = released.gt(0)
      ? await tx.stockReservationEvent.create({
          data: {
            reservationId: pre.id,
            kind: "CONSUME",
            quantity: released.toFixed(),
            actorId: actor.id,
            reason: v.reason ?? "",
          },
        })
      : null;
    const movement = await postMovement(tx, actor, {
      ...v,
      itemId: pre.itemId,
      kind: "CONSUMPTION",
      expectedVersion: item.version,
      referenceAvailable: before.available,
    });
    if (event)
      await tx.stockReservationEvent.update({
        where: { id: event.id },
        data: { movementId: movement.id },
      });
    await tx.stockReservation.update({
      where: { id: pre.id },
      data: { version: { increment: 1 } },
    });
    return movement;
  });
}
export async function releaseSaleReservations(
  tx: Prisma.TransactionClient,
  actor: Actor,
  saleId: string,
): Promise<void> {
  const rows = await tx.stockReservation.findMany({ where: { saleId } });
  await lockStockItems(
    tx,
    rows.map((r) => r.itemId),
  );
  for (const r of rows) {
    const q = await remaining(tx, r.id);
    if (q.gt(0)) {
      await tx.stockReservationEvent.create({
        data: {
          reservationId: r.id,
          kind: "RELEASE",
          quantity: q.toFixed(),
          actorId: actor.id,
          reason: "Cancelamento da venda",
        },
      });
      await tx.stockReservation.update({
        where: { id: r.id },
        data: { version: { increment: 1 } },
      });
      await tx.stockItem.update({
        where: { id: r.itemId },
        data: { version: { increment: 1 } },
      });
    }
  }
}
export async function assertSaleReservationsResolved(
  tx: Prisma.TransactionClient,
  saleId: string,
): Promise<void> {
  const rows = await tx.stockReservation.findMany({ where: { saleId } });
  for (const r of rows)
    if ((await remaining(tx, r.id)).gt(0))
      invalid("Consuma ou libere as reservas antes de concluir a entrega.");
}
export async function releaseReservation(actor: Actor, raw: unknown) {
  const v = releaseSchema.parse(raw);
  const pre = await db.stockReservation.findUnique({
    where: { id: v.reservationId },
  });
  if (!pre) throw new AppError("NOT_FOUND", "Reserva não encontrada.");
  if (!pre.saleId) invalid("Libere esta reserva pela ordem de produção.");
  const saleId = pre.saleId ?? invalid("Reserva sem venda.");
  return runStockCommand(actor, "RELEASE", v, async (tx) => {
    await lockCommerce(tx, { saleId });
    await lockStockItems(tx, [pre.itemId]);
    const row = await tx.stockReservation.findUniqueOrThrow({
      where: { id: pre.id },
    });
    if (row.version !== v.expectedVersion) throw conflict();
    const open = await remaining(tx, row.id),
      q = new D(v.quantity);
    if (!q.gt(0) || q.gt(open))
      invalid("Liberação excede a reserva disponível.");
    const item = await requireStockItem(tx, row.itemId);
    toBaseQuantity(
      v.quantity,
      item.unit as "G" | "ML" | "UNIT",
      item.unit as "G" | "ML" | "UNIT",
    );
    await tx.stockReservationEvent.create({
      data: {
        reservationId: row.id,
        kind: "RELEASE",
        quantity: v.quantity,
        actorId: actor.id,
        reason: v.reason,
      },
    });
    await tx.stockReservation.update({
      where: { id: row.id },
      data: { version: { increment: 1 } },
    });
    await tx.stockItem.update({
      where: { id: row.itemId },
      data: { version: { increment: 1 } },
    });
    return {
      id: row.id,
      version: row.version + 1,
      itemId: row.itemId,
      saleId: row.saleId,
      lineKey: row.lineKey,
      remaining: open.minus(q).toFixed(),
    };
  });
}
