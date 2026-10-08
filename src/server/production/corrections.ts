import { Prisma } from "@prisma/client";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { productionCorrectionSchema } from "@/domain/production/validation";
import { StockDecimal as D } from "@/domain/stock/quantities";
import { civilDateToDb } from "@/domain/commerce/dates";
import { checkDate, invalid, postMovement } from "@/server/stock/movements";
import { runProductionCommand } from "./commands";
import { lineContext, orderDTO } from "./orders";
import { lockProduction } from "./locks";
import { originBalance } from "./finished-stock";
import { projectSale } from "./fulfillment";
export async function correctProduction(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const v = productionCorrectionSchema.parse(raw);
  return runProductionCommand(actor, "PRODUCTION_CORRECT", v, async (tx) => {
    const source = await tx.productionEvent.findUnique({
      where: { id: v.sourceEventId },
      include: { materialLinks: { include: { movement: true } }, origin: true },
    });
    if (!source) throw new AppError("NOT_FOUND", "Apontamento não encontrado.");
    if (!["REPORT", "UPDATE"].includes(source.kind))
      invalid("Corrija o apontamento original.");
    const { order: o, line: l } = await lineContext(tx, source.lineId);
    if (o.version !== v.expectedVersion || o.status === "CANCELADA")
      throw conflict();
    checkDate(v.effectiveDate, v.reason);
    const origins = await tx.finishedOrigin.findMany({
      where: { lineId: l.id },
    });
    await lockProduction(tx, {
      finishedIds: origins.map((x) => x.stockId),
      itemIds: source.materialLinks.map((m) => m.movement.itemId),
    });
    const previous = await tx.productionEvent.findMany({
      where: { sourceId: source.id, kind: "CORRECTION" },
    });
    if (
      v.goodUnitsToReverse >
        source.goodUnits + previous.reduce((n, e) => n + e.goodUnits, 0) ||
      v.failedUnitsToReverse >
        source.failedUnits + previous.reduce((n, e) => n + e.failedUnits, 0)
    )
      invalid("Correção excede o apontamento líquido.");
    const negative = (
      key: "machineMinutes" | "setupMinutes" | "finishingMinutes",
    ) => {
      const q = new D(v[key] ?? 0),
        net = new D(source[key]?.toString() ?? 0).plus(
          previous.reduce((n, e) => n.plus(e[key]?.toString() ?? 0), new D(0)),
        );
      if (q.gt(net)) invalid("Correção excede o tempo registrado.");
      return v[key] === null ? null : q.negated().toFixed();
    };
    if (v.goodUnitsToReverse) {
      if (
        !source.origin ||
        v.goodUnitsToReverse >
          Number((await originBalance(tx, source.origin.id)).available)
      )
        invalid("Resolva compromissos/entregas antes de corrigir peças.");
    }
    if (v.returns.length) {
      const delivered = await tx.finishedMovement.findMany({
        where: {
          originId: { in: origins.map((x) => x.id) },
          kind: { in: ["DELIVERY", "UNDO_DELIVERY"] },
        },
      });
      if (delivered.reduce((n, m) => n + m.units, 0) < 0)
        invalid("Resolva a entrega antes de corrigir material vinculado.");
    }
    if (new Set(v.returns.map((r) => r.linkId)).size !== v.returns.length)
      invalid("Consumo repetido na correção.");
    const correction = await tx.productionEvent.create({
      data: {
        lineId: l.id,
        kind: "CORRECTION",
        sourceId: source.id,
        goodUnits: -v.goodUnitsToReverse,
        failedUnits: -v.failedUnitsToReverse,
        machineMinutes: negative("machineMinutes"),
        setupMinutes: negative("setupMinutes"),
        finishingMinutes: negative("finishingMinutes"),
        materialComplete: true,
        timeComplete: true,
        actorId: actor.id,
        executorId: source.executorId,
        printerId: source.printerId,
        premises: source.premises ?? { manualStage: true },
        reason: v.reason,
        effectiveDate: civilDateToDb(v.effectiveDate),
      },
    });
    if (v.goodUnitsToReverse) {
      const original = await tx.finishedMovement.findFirstOrThrow({
        where: { originId: source.origin!.id, kind: "PRODUCTION" },
      });
      await tx.finishedMovement.create({
        data: {
          originId: source.origin!.id,
          kind: "CORRECTION",
          units: -v.goodUnitsToReverse,
          sourceId: original.id,
          actorId: actor.id,
          reason: v.reason,
          effectiveDate: correction.effectiveDate,
        },
      });
    }
    for (const r of v.returns) {
      const link = source.materialLinks.find((x) => x.id === r.linkId);
      if (!link) invalid("Consumo não pertence ao apontamento.");
      const q = new D(r.quantity);
      const corrected = await tx.productionMaterialLink.aggregate({
        where: {
          movementId: link!.movementId,
          event: { sourceId: source.id, kind: "CORRECTION" },
        },
        _sum: { quantity: true },
      });
      if (
        !q.gt(0) ||
        q.gt(
          new D(link!.quantity.toString()).plus(
            corrected._sum.quantity?.toString() ?? 0,
          ),
        )
      )
        invalid("Devolução excede consumo atribuído.");
      const returned = await tx.stockMovement.aggregate({
        where: { sourceId: link!.movementId, kind: "RETURN_CONSUMPTION" },
        _sum: { quantity: true },
      });
      if (
        q
          .plus(returned._sum.quantity?.toString() ?? 0)
          .gt(link!.movement.quantity.abs().toString())
      )
        invalid("Devolução excede consumo líquido.");
      const item = await tx.stockItem.findUniqueOrThrow({
        where: { id: link!.movement.itemId },
      });
      await postMovement(tx, actor, {
        operationKey: v.operationKey,
        expectedVersion: item.version,
        itemId: item.id,
        kind: "RETURN_CONSUMPTION",
        sourceId: link!.movementId,
        quantity: r.quantity,
        effectiveDate: v.effectiveDate,
        reason: `${v.declaration}: ${v.reason}`,
      });
      await tx.productionMaterialLink.create({
        data: {
          eventId: correction.id,
          movementId: link!.movementId,
          quantity: q.negated().toFixed(),
        },
      });
    }
    for (const stockId of new Set(origins.map((x) => x.stockId)))
      await tx.finishedStock.update({
        where: { id: stockId },
        data: { version: { increment: 1 } },
      });
    await tx.productionOrder.update({
      where: { id: o.id },
      data: { status: "EM_EXECUCAO", version: { increment: 1 } },
    });
    if (o.saleId) await projectSale(tx, o.saleId);
    return orderDTO(tx, o.id);
  });
}
