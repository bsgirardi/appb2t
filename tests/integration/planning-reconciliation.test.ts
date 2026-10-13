import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import {
  planningFixture,
  planningMeta,
  scheduledBatch,
} from "../fixtures/planning";
import { meta, date } from "../fixtures/production";
import { recordMilestone } from "@/server/planning/milestones";
import { recordProduction } from "@/server/production/reports";
import { correctProduction } from "@/server/production/corrections";
import { reconcileBatch } from "@/server/planning/reconciliation";
import { planningTimeSummary } from "@/server/planning/time-summary";
setupDatabase();
it("links explicit per-line results without copying batch time or creating a second report", async () => {
  const f = await planningFixture();
  let b = await scheduledBatch(f, 10);
  for (const kind of [
    "PREPARE_START",
    "PRINT_START",
    "PRINT_END",
    "REMOVE_START",
    "REMOVE_END",
  ])
    b = await recordMilestone(f.actor, {
      ...(await planningMeta(b.version)),
      batchId: b.id,
      kind,
      instant: new Date().toISOString(),
    });
  const report = {
    ...meta(f.order.version),
    lineId: f.order.lines[0].id,
    planningParticipationId: b.participants[0].id,
    executorId: f.actor.id,
    printerId: f.printer.id,
    goodUnits: 8,
    failedUnits: 2,
    machineMinutes: "40",
    setupMinutes: "5",
    finishingMinutes: "0",
    materialComplete: false,
    timeComplete: true,
    materials: [],
    effectiveDate: date(),
    reason: "Duas falhas no lote",
  };
  const order = await recordProduction(f.actor, report);
  expect(
    (
      await db.planningParticipation.findUniqueOrThrow({
        where: { id: b.participants[0].id },
      })
    ).settledUnits,
  ).toBe(10);
  const event = await db.productionEvent.findFirstOrThrow({
    where: { lineId: report.lineId, kind: "REPORT" },
  });
  expect(event.machineMinutes?.toFixed()).toBe("40");
  const times = await db.$transaction(tx => planningTimeSummary(tx, b.id));
  expect(times.reportedMachineMinutes).toBe("40");
  expect(times.complete).toBe(false);
  expect(times.differenceMinutes).not.toBe("0");
  const current = await db.planningBatch.findUniqueOrThrow({
    where: { id: b.id },
  });
  const payload = {
    ...(await planningMeta(current.version)),
    batchId: b.id,
    links: [
      {
        participationId: b.participants[0].id,
        eventId: event.id,
        goodUnits: 8,
        failedUnits: 2,
      },
    ],
    reason: "Conferência",
  };
  await reconcileBatch(f.actor, payload);
  await reconcileBatch(f.actor, payload);
  expect(await db.productionEvent.count({ where: { kind: "REPORT" } })).toBe(1);
  await correctProduction(f.actor, {
    ...meta(order.version),
    sourceEventId: event.id,
    goodUnitsToReverse: 0,
    failedUnitsToReverse: 1,
    machineMinutes: null,
    setupMinutes: null,
    finishingMinutes: null,
    returns: [],
    declaration: "ENTRY_ERROR",
    effectiveDate: date(),
    reason: "Corrigir contagem",
  });
  expect(
    (
      await db.planningParticipation.findUniqueOrThrow({
        where: { id: b.participants[0].id },
      })
    ).settledUnits,
  ).toBe(9);
  expect(await db.planningBatch.count()).toBe(1);
});
