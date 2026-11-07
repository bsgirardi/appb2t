import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import {
  reserveFinishedSchema,
  releaseFinishedSchema,
} from "@/domain/production/validation";
import { projectSaleStatus } from "@/domain/production/states";
import { invalid } from "@/server/stock/movements";
import { runProductionCommand, requireProductionActor } from "./commands";
import { lockProduction } from "./locks";
import { activeSale, demand } from "./orders";
import {
  finishedDTO,
  finishedRow,
  originBalance,
  restrictedOriginSale,
} from "./finished-stock";
export async function commitmentRemaining(
  tx: Prisma.TransactionClient,
  id: string,
) {
  return (
    (
      await tx.finishedCommitmentEvent.aggregate({
        where: { commitmentId: id },
        _sum: { units: true },
      })
    )._sum.units ?? 0
  );
}
export async function projectSale(
  tx: Prisma.TransactionClient,
  saleId: string,
) {
  const sale = await tx.sale.findUniqueOrThrow({
    where: { id: saleId },
    include: { items: true },
  });
  if (
    sale.fulfillmentMode !== "U3" ||
    ["CANCELADA", "RASCUNHO"].includes(sale.status)
  )
    return;
  const lines = [];
  for (const l of sale.items) {
    const delivered =
      (
        await tx.productionDeliveryLine.aggregate({
          where: { delivery: { saleId }, lineKey: l.lineKey ?? "" },
          _sum: { units: true },
        })
      )._sum.units ?? 0;
    const ready =
      (
        await tx.finishedCommitmentEvent.aggregate({
          where: { commitment: { saleId, lineKey: l.lineKey ?? "" } },
          _sum: { units: true },
        })
      )._sum.units ?? 0;
    const started = Boolean(
      await tx.productionOrder.findFirst({
        where: {
          saleId,
          status: { in: ["LIBERADA", "EM_EXECUCAO", "CONCLUIDA"] },
        },
      }),
    );
    lines.push({ sold: l.quantity, delivered, ready, started });
  }
  const status = projectSaleStatus(lines);
  await tx.sale.update({
    where: { id: saleId },
    data: { status, version: { increment: 1 } },
  });
}
export async function reserveFinished(actor: Actor, raw: unknown) {
  const v = reserveFinishedSchema.parse(raw);
  return runProductionCommand(actor, "FINISHED_RESERVE", v, (tx) =>
    reserveFinishedWithClient(tx, actor, v),
  );
}
export async function reserveFinishedWithClient(
  tx: Prisma.TransactionClient,
  actor: Actor,
  v: ReturnType<typeof reserveFinishedSchema.parse>,
) {
  await lockProduction(tx, { saleIds: [v.saleId], finishedIds: [v.stockId] });
  const sale = await activeSale(tx, v.saleId);
  if (sale.version !== v.saleVersion) throw conflict();
  const s = await finishedRow(tx, v.stockId);
  if (s.version !== v.expectedVersion) throw conflict();
  if (!s.active || !s.inventoriedAt)
    invalid("Peças não inventariadas ou inativas.");
  const d = await demand(tx, v.saleId, v.lineKey);
  if (
    s.productId
      ? d.item.productId !== s.productId
      : s.ownerSaleId !== v.saleId || s.lineKey !== v.lineKey
  )
    invalid("Peças incompatíveis com a linha da venda.");
  if (v.units > d.remaining) invalid("Quantidade excede a demanda restante.");
  if (
    new Set(v.originAllocations.map((a) => a.originId)).size !==
      v.originAllocations.length ||
    v.originAllocations.reduce((n, a) => n + a.units, 0) !== v.units
  )
    invalid("Confira a distribuição por origem.");
  for (const a of v.originAllocations) {
    const origin = await tx.finishedOrigin.findUnique({
      where: { id: a.originId },
    });
    if (origin?.stockId !== s.id) invalid("Origem incompatível.");
    const restricted = await restrictedOriginSale(tx, a.originId);
    if (restricted && restricted !== v.saleId)
      invalid(
        "Peças exclusivas de outra venda. Um administrador deve registrar a destinação para estoque antes de realocar.",
      );
    if (a.units > Number((await originBalance(tx, a.originId)).available))
      invalid("Peças disponíveis insuficientes.");
    const c = await tx.finishedCommitment.upsert({
      where: {
        saleId_lineKey_originId: {
          saleId: v.saleId,
          lineKey: v.lineKey,
          originId: a.originId,
        },
      },
      create: { saleId: v.saleId, lineKey: v.lineKey, originId: a.originId },
      update: {},
    });
    await tx.finishedCommitmentEvent.create({
      data: {
        commitmentId: c.id,
        kind: "RESERVE",
        units: a.units,
        actorId: actor.id,
        reason: v.reason ?? "",
      },
    });
  }
  await tx.finishedStock.update({
    where: { id: s.id },
    data: { version: { increment: 1 } },
  });
  await projectSale(tx, v.saleId);
  return finishedDTO(tx, s.id);
}
export async function releaseFinished(actor: Actor, raw: unknown) {
  const v = releaseFinishedSchema.parse(raw);
  return runProductionCommand(actor, "FINISHED_RELEASE", v, async (tx) => {
    const c = await tx.finishedCommitment.findUnique({
      where: { id: v.commitmentId },
      include: { origin: true },
    });
    if (!c) throw new AppError("NOT_FOUND", "Compromisso não encontrado.");
    await lockProduction(tx, {
      saleIds: [c.saleId],
      finishedIds: [c.origin.stockId],
    });
    const s = await finishedRow(tx, c.origin.stockId);
    if (s.version !== v.expectedVersion) throw conflict();
    if (v.units > (await commitmentRemaining(tx, c.id)))
      invalid("Liberação excede peças comprometidas.");
    await tx.finishedCommitmentEvent.create({
      data: {
        commitmentId: c.id,
        kind: "RELEASE",
        units: -v.units,
        actorId: actor.id,
        reason: v.reason,
      },
    });
    await tx.finishedStock.update({
      where: { id: s.id },
      data: { version: { increment: 1 } },
    });
    await projectSale(tx, c.saleId);
    return finishedDTO(tx, s.id);
  });
}
export async function suggestFinished(
  actor: Actor,
  saleId: string,
  lineKey: string,
  units: number,
) {
  await requireProductionActor(actor);
  const item = await db.saleItem.findFirst({ where: { saleId, lineKey } });
  if (!item) throw new AppError("NOT_FOUND", "Linha não encontrada.");
  return db.$transaction(async (tx) => {
    const origins = await tx.finishedOrigin.findMany({
      where: {
        stock: item.productId
          ? { productId: item.productId, active: true }
          : { ownerSaleId: saleId, lineKey, active: true },
      },
      orderBy: { sequence: "asc" },
    });
    let left = units;
    const result = [];
    for (const o of origins) {
      const restricted = await restrictedOriginSale(tx, o.id);
      if (restricted && restricted !== saleId) continue;
      const q = Math.min(
        left,
        Number((await originBalance(tx, o.id)).available),
      );
      if (q > 0) {
        result.push({ originId: o.id, units: q });
        left -= q;
      }
      if (left === 0) break;
    }
    return result;
  });
}
