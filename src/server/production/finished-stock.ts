import type { Prisma } from "@prisma/client";
import { AppError, conflict } from "@/lib/errors";
import { finishedBalance } from "@/domain/production/quantities";
import type { FinishedDTO } from "@/domain/production/types";
import {
  finishedSaveSchema,
  finishedOpenSchema,
  finishedAdjustSchema,
} from "@/domain/production/validation";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { lockOperation } from "@/server/commerce/locks";
import { checkDate, invalid } from "@/server/stock/movements";
import { civilDateToDb } from "@/domain/commerce/dates";
import { lockProduction } from "./locks";
import { runProductionCommand } from "./commands";
export async function finishedRow(tx: Prisma.TransactionClient, id: string) {
  const s = await tx.finishedStock.findUnique({ where: { id } });
  if (!s) throw new AppError("NOT_FOUND", "Estoque de peças não encontrado.");
  return s;
}
export async function originBalance(
  tx: Prisma.TransactionClient,
  originId: string,
) {
  const [moves, events] = await Promise.all([
    tx.finishedMovement.findMany({ where: { originId } }),
    tx.finishedCommitmentEvent.findMany({
      where: { commitment: { originId } },
    }),
  ]);
  return finishedBalance(
    moves.map((v) => String(v.units)),
    events.map((v) => String(v.units)),
  );
}
export async function finishedDTO(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<FinishedDTO> {
  const s = await finishedRow(tx, id);
  const [moves, events] = await Promise.all([
    tx.finishedMovement.findMany({ where: { origin: { stockId: id } } }),
    tx.finishedCommitmentEvent.findMany({
      where: { commitment: { origin: { stockId: id } } },
    }),
  ]);
  return {
    id: s.id,
    productId: s.productId,
    active: s.active,
    version: s.version,
    inventoriedAt: s.inventoriedAt?.toISOString() ?? null,
    ...finishedBalance(
      moves.map((v) => String(v.units)),
      events.map((v) => String(v.units)),
    ),
  };
}
export async function saveFinishedStock(
  actor: Actor,
  raw: unknown,
): Promise<FinishedDTO> {
  assertAdmin(actor);
  const v = finishedSaveSchema.parse(raw);
  return runProductionCommand(actor, "FINISHED_SAVE", v, async (tx) => {
    await lockOperation(tx, `finished-product:${v.productId}`);
    const p = await tx.product.findUnique({ where: { id: v.productId } });
    if (!p?.active) invalid("Produto indisponível.");
    if (v.id) {
      await lockProduction(tx, { finishedIds: [v.id] });
      const old = await finishedRow(tx, v.id);
      if (old.version !== v.expectedVersion || old.productId !== v.productId)
        throw conflict();
      const state = await finishedDTO(tx, v.id);
      if (!v.active && state.reserved !== "0")
        invalid("Resolva os compromissos antes de desativar.");
      await tx.finishedStock.update({
        where: { id: v.id },
        data: { active: v.active, version: { increment: 1 } },
      });
      return finishedDTO(tx, v.id);
    }
    if (
      v.expectedVersion !== 0 ||
      (await tx.finishedStock.findUnique({ where: { productId: v.productId } }))
    )
      throw conflict();
    const s = await tx.finishedStock.create({
      data: { productId: v.productId, active: v.active },
    });
    return finishedDTO(tx, s.id);
  });
}
export async function openFinishedStock(
  actor: Actor,
  raw: unknown,
): Promise<FinishedDTO> {
  assertAdmin(actor);
  const v = finishedOpenSchema.parse(raw);
  return runProductionCommand(actor, "FINISHED_OPEN", v, async (tx) => {
    checkDate(v.effectiveDate, v.reason);
    await lockProduction(tx, { finishedIds: [v.stockId] });
    const s = await finishedRow(tx, v.stockId);
    if (s.version !== v.expectedVersion || s.inventoriedAt) throw conflict();
    if (!s.active) invalid("Estoque inativo.");
    if (v.units === 0 && v.value !== null && v.value !== "0")
      invalid("Estoque vazio não pode ter valor positivo.");
    await tx.finishedOrigin.create({
      data: {
        stockId: s.id,
        kind: "OPENING",
        initialValue: v.value,
        movements: {
          create: {
            kind: "OPENING",
            units: v.units,
            actorId: actor.id,
            effectiveDate: civilDateToDb(v.effectiveDate),
            reason: v.reason ?? "",
          },
        },
      },
    });
    await tx.finishedStock.update({
      where: { id: s.id },
      data: { inventoriedAt: new Date(), version: { increment: 1 } },
    });
    return finishedDTO(tx, s.id);
  });
}
export async function adjustFinishedStock(
  actor: Actor,
  raw: unknown,
): Promise<FinishedDTO> {
  assertAdmin(actor);
  const v = finishedAdjustSchema.parse(raw);
  return runProductionCommand(actor, "FINISHED_ADJUST", v, async (tx) => {
    checkDate(v.effectiveDate, v.reason);
    await lockProduction(tx, { finishedIds: [v.stockId] });
    const s = await finishedRow(tx, v.stockId);
    if (s.version !== v.expectedVersion) throw conflict();
    if (!s.active || !s.inventoriedAt)
      invalid("Estoque inativo ou não inventariado.");
    const date = civilDateToDb(v.effectiveDate);
    if (v.deltaUnits > 0)
      await tx.finishedOrigin.create({
        data: {
          stockId: s.id,
          kind: "ADJUSTMENT",
          initialValue: v.value ?? null,
          movements: {
            create: {
              kind: "ADJUSTMENT_IN",
              units: v.deltaUnits,
              actorId: actor.id,
              reason: v.reason,
              effectiveDate: date,
            },
          },
        },
      });
    else {
      let left = -v.deltaUnits;
      const state = await finishedDTO(tx, s.id);
      if (left > Number(state.available))
        invalid("Peças disponíveis insuficientes para o ajuste.");
      const origins = await tx.finishedOrigin.findMany({
        where: { stockId: s.id },
        orderBy: { sequence: "asc" },
      });
      for (const o of origins) {
        const q = Math.min(
          left,
          Number((await originBalance(tx, o.id)).available),
        );
        if (q) {
          await tx.finishedMovement.create({
            data: {
              originId: o.id,
              kind: "ADJUSTMENT_OUT",
              units: -q,
              actorId: actor.id,
              reason: v.reason,
              effectiveDate: date,
            },
          });
          left -= q;
        }
        if (!left) break;
      }
    }
    await tx.finishedStock.update({
      where: { id: s.id },
      data: { version: { increment: 1 } },
    });
    return finishedDTO(tx, s.id);
  });
}
