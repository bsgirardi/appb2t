import { projectSale } from "./fulfillment";
import { conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { reportSchema } from "@/domain/production/validation";
import { civilDateToDb } from "@/domain/commerce/dates";
import { StockDecimal as D } from "@/domain/stock/quantities";
import {
  balance,
  checkDate,
  invalid,
  postMovement,
} from "@/server/stock/movements";
import { requireStockItem } from "@/server/stock/catalog";
import { runProductionCommand } from "./commands";
import { lineContext, executable, orderDTO, activeSale } from "./orders";
import { lockProduction } from "./locks";
import { allocationRemaining } from "./reservations";
import { linkReportTx } from "@/server/planning/invariants";
export async function recordProduction(actor: Actor, raw: unknown) {
  const v = reportSchema.parse(raw);
  return runProductionCommand(actor, "PRODUCTION_REPORT", v, async (tx) => {
    const { order: o, line: l } = await lineContext(tx, v.lineId);
    if (o.version !== v.expectedVersion) throw conflict();
    executable(o.status);
    if (o.saleId) await activeSale(tx, o.saleId);
    checkDate(v.effectiveDate, v.reason);
    if (v.failedUnits && !v.reason) invalid("Informe o motivo da falha.");
    const good = l.events.reduce((s, e) => s + e.goodUnits, 0),
      canceled = l.events.reduce((s, e) => s + e.canceledUnits, 0);
    if (good + v.goodUnits + canceled > l.targetUnits)
      invalid("Peças boas excedem a meta restante.");
    if (v.reprintOf) {
      const old = l.events.find(
        (e) => e.id === v.reprintOf && e.kind === "REPORT",
      );
      if (
        !old ||
        old.failedUnits +
          l.events
            .filter((e) => e.sourceId === old.id)
            .reduce((s, e) => s + e.failedUnits, 0) <=
          0
      )
        invalid("Reimpressão exige tentativa falha da mesma linha.");
    }
    if (
      !(await tx.user.findFirst({ where: { id: v.executorId, active: true } }))
    )
      invalid("Executor indisponível.");
    let printer = null;
    if (v.printerId) {
      printer = await tx.printer.findUnique({ where: { id: v.printerId } });
      if (!printer?.active || printer.technology !== l.technology)
        invalid("Máquina incompatível ou inativa.");
    }
    if (!v.manualStage && !printer)
      invalid("Informe a máquina utilizada ou uma etapa manual.");
    if (v.manualStage && (v.printerId || new D(v.machineMinutes ?? 0).gt(0)))
      invalid("Etapa manual não informa máquina ou tempo de máquina.");
    if (
      v.timeComplete &&
      [
        v.setupMinutes,
        v.finishingMinutes,
        ...(v.manualStage ? [] : [v.machineMinutes]),
      ].some((x) => x === null)
    )
      invalid("Para tempo completo informe as medições, inclusive zero.");
    const stock = await tx.finishedStock.findFirst({
      where: l.productId
        ? { productId: l.productId }
        : { ownerSaleId: o.saleId, lineKey: l.saleLineKey },
    });
    if (!stock) invalid("Estoque de peças não encontrado.");
    await lockProduction(tx, {
      finishedIds: [stock!.id],
      itemIds: v.materials.map((m) => m.itemId),
    });
    const current = await tx.finishedStock.findUniqueOrThrow({
      where: { id: stock!.id },
    });
    if (!current.active || !current.inventoriedAt)
      invalid("Estoque de peças indisponível.");
    const planned = (
      o.premises as { plannedPrinters?: Record<string, { id: string }> } | null
    )?.plannedPrinters?.[l.id];
    const printerPremises = planned?.id === printer?.id ? planned : printer;
    const event = await tx.productionEvent.create({
      data: {
        lineId: l.id,
        kind: "REPORT",
        goodUnits: v.goodUnits,
        failedUnits: v.failedUnits,
        machineMinutes: v.machineMinutes,
        setupMinutes: v.setupMinutes,
        finishingMinutes: v.finishingMinutes,
        timeComplete: v.timeComplete,
        materialComplete: v.materialComplete,
        reprintOf: v.reprintOf,
        printerId: v.printerId,
        executorId: v.executorId,
        actorId: actor.id,
        reason: v.reason ?? "",
        effectiveDate: civilDateToDb(v.effectiveDate),
        premises: {
          settings: o.premises,
          manualStage: v.manualStage,
          printer: printerPremises
            ? JSON.parse(JSON.stringify(printerPremises))
            : null,
        },
      },
    });
    for (const m of v.materials) {
      const item = await requireStockItem(tx, m.itemId);
      const q = new D(m.quantity);
      if (!q.gt(0)) invalid("Consumo deve ser positivo.");
      let reservationEventId: string | undefined;
      const before = await balance(tx, item.id);
      if (m.reservationAllocationId) {
        const a = await tx.productionReservationAllocation.findUnique({
          where: { id: m.reservationAllocationId },
          include: { reservation: true },
        });
        if (!a || a.lineId !== l.id || a.reservation.itemId !== item.id)
          invalid("Reserva incompatível com o apontamento.");
        const open = await allocationRemaining(tx, a!.id);
        if (q.gt(open) && !m.allowExcess)
          invalid("Confirme consumo acima da reserva.");
        const released = D.min(q, open);
        if (released.gt(0)) {
          await tx.productionReservationEvent.create({
            data: {
              allocationId: a!.id,
              kind: "CONSUME",
              quantity: released.toFixed(),
              actorId: actor.id,
              reason: v.reason ?? "",
            },
          });
          const re = await tx.stockReservationEvent.create({
            data: {
              reservationId: a!.reservationId,
              kind: "CONSUME",
              quantity: released.toFixed(),
              actorId: actor.id,
              reason: v.reason ?? "",
            },
          });
          reservationEventId = re.id;
          await tx.stockReservation.update({
            where: { id: a!.reservationId },
            data: { version: { increment: 1 } },
          });
        }
      }
      const movement = await postMovement(tx, actor, {
        operationKey: v.operationKey,
        expectedVersion: item.version,
        itemId: item.id,
        kind: "CONSUMPTION",
        quantity: m.quantity,
        allocations: m.allocations,
        effectiveDate: v.effectiveDate,
        reason: v.reason,
        referenceAvailable: before.available,
      });
      if (reservationEventId)
        await tx.stockReservationEvent.update({
          where: { id: reservationEventId },
          data: { movementId: movement.id },
        });
      await tx.productionMaterialLink.create({
        data: {
          eventId: event.id,
          movementId: movement.id,
          quantity: m.quantity,
        },
      });
    }
    if (v.goodUnits) {
      const origin = await tx.finishedOrigin.create({
        data: {
          stockId: current.id,
          kind: "PRODUCTION",
          lineId: l.id,
          eventId: event.id,
          movements: {
            create: {
              kind: "PRODUCTION",
              units: v.goodUnits,
              actorId: actor.id,
              effectiveDate: civilDateToDb(v.effectiveDate),
              reason: v.reason ?? "",
            },
          },
        },
      });
      if (o.saleId && l.saleLineKey)
        await tx.finishedCommitment.create({
          data: {
            saleId: o.saleId,
            lineKey: l.saleLineKey,
            originId: origin.id,
            events: {
              create: {
                kind: "RESERVE",
                units: v.goodUnits,
                actorId: actor.id,
              },
            },
          },
        });
      await tx.finishedStock.update({
        where: { id: current.id },
        data: { version: { increment: 1 } },
      });
    }
    await tx.productionOrder.update({
      where: { id: o.id },
      data: { status: "EM_EXECUCAO", version: { increment: 1 } },
    });
    if (v.planningParticipationId)
      await linkReportTx(tx, {
        participationId: v.planningParticipationId,
        eventId: event.id,
        goodUnits: v.goodUnits,
        failedUnits: v.failedUnits,
      });
    if (o.saleId) await projectSale(tx, o.saleId);
    return orderDTO(tx, o.id);
  });
}
