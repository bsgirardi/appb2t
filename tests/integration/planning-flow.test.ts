import { afterEach, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import {
  planningFixture,
  planningMeta,
  scheduledBatch,
} from "../fixtures/planning";
import { meta, date, sale } from "../fixtures/production";
import { saveOrder, releaseOrder } from "@/server/production/orders";
import { reserveOrderMaterial } from "@/server/production/reservations";
import { recordProduction } from "@/server/production/reports";
import {
  saveBatch,
  confirmBatch,
  scheduleBatch,
} from "@/server/planning/batches";
import { setBatchCoverage } from "@/server/planning/materials";
import { recordMilestone, reorderQueue } from "@/server/planning/milestones";
import { saveCalendar } from "@/server/planning/calendars";
import { getPlanning } from "@/server/planning/queries";
import { forecast } from "@/domain/planning/scheduler";
import { civilDay, civilInstant } from "@/domain/planning/calendar";
import type { BatchDTO } from "@/domain/planning/types";
setupDatabase();
afterEach(() => vi.useRealTimers());
it("executes a mixed overnight batch and another machine, reconciles failed pieces and schedules retry without financial duplication", async () => {
  // The scenario records removals through 08:20 in São Paulo.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-23T15:00:00.000Z"));
  const f = await planningFixture();
  const p2 = await db.printer.create({
    data: {
      name: "Máquina B",
      technology: "FDM",
      acquisitionCost: "1000",
      amortizationMonths: 12,
      daysPerMonth: 20,
      hoursPerDay: "8",
      watts: "100",
    },
  });
  async function orderFor(printerId: string) {
    const s = await sale();
    const draft = await saveOrder(f.actor, {
      ...meta(),
      origin: "SALE",
      saleId: s.id,
      dueDate: date(),
      responsibleId: f.actor.id,
      lines: [
        {
          saleLineKey: "line1",
          description: "Peça adicional",
          technology: "FDM",
          targetUnits: 10,
          plannedPrinterId: printerId,
        },
      ],
    });
    let o = await releaseOrder(f.actor, {
      ...meta(draft.version),
      orderId: draft.id,
    });
    o = await reserveOrderMaterial(f.actor, {
      ...meta(o.version),
      lineId: o.lines[0].id,
      itemId: f.material.id,
      quantity: "100",
      effectiveDate: date(),
    });
    const allocation =
      await db.productionReservationAllocation.findFirstOrThrow({
        where: { lineId: o.lines[0].id },
      });
    return { order: o, allocation };
  }
  const second = await orderFor(f.printer.id),
    third = await orderFor(p2.id);
  for (const printerId of [null, f.printer.id, p2.id])
    await saveCalendar(f.actor, {
      ...(await planningMeta()),
      resource: printerId ? "PRINTER" : "TEAM",
      printerId,
      weekly: Array.from({ length: 7 }, (_, i) => ({
        weekday: i + 1,
        startMinute: printerId ? 0 : 480,
        endMinute: printerId ? 1440 : 1080,
      })),
      exceptions: [],
    });
  const beforeFinance = await db.financialEntry.count(),
    beforeEvents = await db.productionEvent.count();
  let a = await saveBatch(f.actor, {
    ...(await planningMeta()),
    printerId: f.printer.id,
    materialItemId: f.material.id,
    colorLabel: "Azul",
    participants: [f.order, second.order].map((o) => ({
      lineId: o.lines[0].id,
      units: 5,
    })),
    profileConfirmed: true,
    fitConfirmed: true,
    durationMinutes: "540",
    durationConfirmed: true,
    prepareMinutes: "5",
    removeMinutes: "10",
  });
  a = await confirmBatch(f.actor, {
    ...(await planningMeta(a.version)),
    batchId: a.id,
  });
  a = await setBatchCoverage(f.actor, {
    ...(await planningMeta(a.version)),
    batchId: a.id,
    colorAvailabilityConfirmed: true,
    needs: a.participants.map((p) => ({
      participationId: p.id,
      quantity: "50",
    })),
    allocations: a.participants.map((p) => ({
      participationId: p.id,
      allocationId:
        p.lineId === f.order.lines[0].id
          ? f.allocation.id
          : second.allocation.id,
      quantity: "50",
    })),
  });
  a = await scheduleBatch(f.actor, {
    ...(await planningMeta(a.version)),
    batchId: a.id,
  });
  let b = await scheduledBatch({ ...f, printer: p2, ...third });
  await reorderQueue(f.actor, {
    ...(await planningMeta()),
    printerId: f.printer.id,
    batchIds: [a.id],
  });
  a = (await getPlanning(f.actor)).batches.find((x) => x.id === a.id)!;
  expect(await db.productionEvent.count()).toBe(beforeEvents);
  const day = civilDay(new Date(Date.now() - 86400000).toISOString());
  const nextDay = date();
  async function marker(
    batch: BatchDTO,
    kind: string,
    dayValue: string,
    minute: number,
  ) {
    return recordMilestone(f.actor, {
      ...(await planningMeta(batch.version)),
      batchId: batch.id,
      kind,
      instant: new Date(civilInstant(dayValue, minute)).toISOString(),
    });
  }
  a = await marker(a, "PREPARE_START", day, 1015);
  a = await marker(a, "PRINT_START", day, 1020);
  b = await marker(b, "PREPARE_START", day, 1020);
  b = await marker(b, "PRINT_START", day, 1025);
  // The second machine extends its explicit remaining estimate to the same 02:00 finish.
  b = await recordMilestone(f.actor, {
    ...(await planningMeta(b.version)),
    batchId: b.id,
    kind: "REMAINING",
    instant: new Date(civilInstant(day, 1025)).toISOString(),
    remainingMinutes: "535",
  });
  const data = await getPlanning(f.actor);
  const projected = forecast({
    asOf: new Date(civilInstant(day, 1380)).toISOString(),
    revision: data.revision,
    team: data.calendars.find((c) => c.id === "TEAM")!,
    machines: data.printers.map((p) => ({
      id: p.id,
      calendar: data.calendars.find((c) => c.id === `PRINTER:${p.id}`)!,
      batches: data.batches.filter((x) => x.printerId === p.id),
    })),
  });
  expect(projected.batches.map((x) => x.removal?.start).sort()).toEqual([
    new Date(civilInstant(nextDay, 480)).toISOString(),
    new Date(civilInstant(nextDay, 490)).toISOString(),
  ]);
  expect(projected.totals.reduce((n, t) => n + t.printMinutes, 0)).toBe(360);
  a = await marker(a, "PRINT_END", nextDay, 120);
  b = await marker(b, "PRINT_END", nextDay, 120);
  a = await marker(a, "REMOVE_START", nextDay, 480);
  a = await marker(a, "REMOVE_END", nextDay, 490);
  b = await marker(b, "REMOVE_START", nextDay, 490);
  b = await marker(b, "REMOVE_END", nextDay, 500);
  for (const [batch, order, good, failed, minutes] of [
    [a, f.order, 4, 1, "400"],
    [a, second.order, 5, 0, "140"],
    [b, third.order, 5, 0, "535"],
  ] as const)
    await recordProduction(f.actor, {
      ...meta(order.version),
      lineId: order.lines[0].id,
      planningParticipationId: batch.participants.find(
        (p) => p.lineId === order.lines[0].id,
      )!.id,
      executorId: f.actor.id,
      printerId: batch.printerId,
      goodUnits: good,
      failedUnits: failed,
      machineMinutes: minutes,
      setupMinutes: "0",
      finishingMinutes: "0",
      materialComplete: false,
      timeComplete: true,
      materials: [],
      effectiveDate: date(),
      reason: "Execução conferida; uma falha para nova tentativa",
    });
  const after = await getPlanning(f.actor);
  expect(after.timeSummaries.find((t) => t.batchId === a.id)).toMatchObject({
    complete: true,
    reportedMachineMinutes: "540",
  });
  expect(
    after.batches
      .find((x) => x.id === a.id)
      ?.participants.every((p) => p.settledUnits === 5),
  ).toBe(true);
  const retry = await scheduledBatch(f, 1);
  expect(retry.state).toBe("SCHEDULED");
  expect(await db.financialEntry.count()).toBe(beforeFinance);
  expect(await db.productionEvent.count({ where: { kind: "REPORT" } })).toBe(3);
});
