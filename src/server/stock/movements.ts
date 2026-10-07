import { Prisma } from "@prisma/client";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { movementSchema, type MovementInput } from "@/domain/stock/validation";
import {
  StockDecimal as D,
  toBaseQuantity,
  stockState,
} from "@/domain/stock/quantities";
import { civilDateToDb, todaySaoPaulo } from "@/domain/commerce/dates";
import { lockStockItems, runStockCommand } from "./commands";
import { requireStockItem } from "./catalog";
import { revalueItem } from "./valuation";
export const invalid = (message: string): never => {
  throw new AppError("VALIDATION", message);
};
export function checkDate(date: string, reason?: string) {
  const today = todaySaoPaulo(new Date());
  if (date > today) invalid("Data futura não permitida.");
  if (date < today && !reason) invalid("Justifique o lançamento retroativo.");
}
export async function balance(tx: Prisma.TransactionClient, itemId: string) {
  const physical =
    (
      await tx.stockMovement.aggregate({
        where: { itemId },
        _sum: { quantity: true },
      })
    )._sum.quantity?.toFixed() ?? "0";
  const events = await tx.stockReservationEvent.findMany({
    where: { reservation: { itemId } },
  });
  const reserved = events
    .reduce(
      (n, e) =>
        n.plus(
          new D(e.quantity.toString()).times(e.kind === "RESERVE" ? 1 : -1),
        ),
      new D(0),
    )
    .toFixed();
  return stockState(physical, reserved);
}
export async function postMovement(
  tx: Prisma.TransactionClient,
  actor: Actor,
  v: Omit<MovementInput, "kind"> & {
    kind: string;
    receiptLineId?: string;
    sourceId?: string;
    referenceAvailable?: string;
  },
) {
  const item = await requireStockItem(tx, v.itemId);
  if (!item.active || !item.inventoriedAt)
    invalid("Item inativo ou não inventariado.");
  if (item.version !== v.expectedVersion) throw conflict();
  if (
    v.kind === "ADJUSTMENT_IN" &&
    item.method === "WEIGHTED_AVERAGE" &&
    v.value === undefined
  )
    invalid(
      "Informe o valor do ajuste, inclusive zero para material sem custo.",
    );
  checkDate(v.effectiveDate, v.reason);
  const q = new D(
    toBaseQuantity(
      v.quantity,
      item.unit as "G" | "ML" | "UNIT",
      item.unit as "G" | "ML" | "UNIT",
    ),
  );
  if (!q.gt(0)) invalid("Informe quantidade positiva.");
  const sign = ["RECEIPT", "ADJUSTMENT_IN", "RETURN_CONSUMPTION"].includes(
    v.kind,
  )
    ? 1
    : -1;
  const current = await balance(tx, item.id),
    signed = q.times(sign),
    next = new D(current.available).plus(signed);
  if (
    sign < 0 &&
    ((next.lt(0) && next.lt(v.referenceAvailable ?? current.available)) ||
      new D(current.physical).plus(signed).lt(0)) &&
    !v.reason
  )
    invalid("Justifique a falta de material.");
  const allocations = v.allocations ?? [
    { identityId: null, quantity: q.toFixed() },
  ];
  const total = allocations.reduce((n, a) => n.plus(a.quantity), new D(0));
  if (!total.eq(q)) invalid("Distribuição deve fechar a quantidade.");
  const seen = new Set<string | null>();
  for (const a of allocations) {
    if (seen.has(a.identityId)) invalid("Identificação repetida.");
    seen.add(a.identityId);
    if (!new D(a.quantity).gt(0)) invalid("Distribuição deve ser positiva.");
    toBaseQuantity(
      a.quantity,
      item.unit as "G" | "ML" | "UNIT",
      item.unit as "G" | "ML" | "UNIT",
    );
    if (
      a.identityId &&
      !(await tx.stockIdentity.findFirst({
        where: { id: a.identityId, itemId: item.id },
      }))
    )
      invalid("Identificação de outro material.");
    const old =
      (
        await tx.stockMovementAllocation.aggregate({
          where: { identityId: a.identityId, movement: { itemId: item.id } },
          _sum: { quantity: true },
        })
      )._sum.quantity?.toFixed() ?? "0";
    if (sign < 0 && new D(old).minus(a.quantity).lt(0) && !v.reason)
      invalid("Justifique a falta nesta identificação.");
  }
  const row = await tx.stockMovement.create({
    data: {
      itemId: item.id,
      kind: v.kind,
      quantity: signed.toFixed(),
      method: item.method,
      manualUnitCost: item.manualUnitCost,
      confirmedValue: sign > 0 ? (v.value ?? null) : null,
      receiptLineId: v.receiptLineId,
      sourceId: v.sourceId,
      actorId: actor.id,
      reason: v.reason ?? "",
      effectiveDate: civilDateToDb(v.effectiveDate),
      allocations: {
        create: allocations.map((a) => ({
          identityId: a.identityId,
          quantity: new D(a.quantity).times(sign).toFixed(),
        })),
      },
    },
  });
  await tx.stockItem.update({
    where: { id: item.id },
    data: { version: { increment: 1 } },
  });
  await revalueItem(tx, item.id);
  return {
    id: row.id,
    itemId: row.itemId,
    kind: row.kind,
    quantity: row.quantity.toFixed(),
    actorId: row.actorId,
    reason: row.reason,
    effectiveDate: v.effectiveDate,
  };
}
export async function recordMovement(actor: Actor, raw: unknown) {
  const v = movementSchema.parse(raw);
  if (v.kind.startsWith("ADJUSTMENT")) {
    assertAdmin(actor);
    if (!v.reason) invalid("Justifique o ajuste.");
  } else if (v.value !== undefined)
    invalid("Custo não permitido nesta operação.");
  return runStockCommand(actor, "MOVEMENT", v, async (tx) => {
    await lockStockItems(tx, [v.itemId]);
    return postMovement(tx, actor, v);
  });
}
