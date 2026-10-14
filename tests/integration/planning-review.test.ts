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
import { releaseBatchRemainder } from "@/server/planning/reconciliation";
import { batchDTO, unclaimed } from "@/server/planning/batch-read";
import { setBatchCoverage } from "@/server/planning/materials";
import type { BatchDTO } from "@/domain/planning/types";
setupDatabase();
async function close(
  f: Awaited<ReturnType<typeof planningFixture>>,
  b: BatchDTO,
) {
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
  return b;
}
it("releases corrected unexecuted pieces explicitly and preserves original reports", async () => {
  const f = await planningFixture();
  const b = await close(f, await scheduledBatch(f, 10));
  const o = await recordProduction(f.actor, {
    ...meta(f.order.version),
    lineId: f.order.lines[0].id,
    planningParticipationId: b.participants[0].id,
    executorId: f.actor.id,
    printerId: f.printer.id,
    goodUnits: 0,
    failedUnits: 10,
    machineMinutes: "60",
    setupMinutes: "5",
    finishingMinutes: "0",
    materialComplete: false,
    timeComplete: true,
    materials: [],
    effectiveDate: date(),
    reason: "Falha do lote",
  });
  const e = await db.productionEvent.findFirstOrThrow({
    where: { kind: "REPORT" },
  });
  await correctProduction(f.actor, {
    ...meta(o.version),
    sourceEventId: e.id,
    goodUnitsToReverse: 0,
    failedUnitsToReverse: 1,
    machineMinutes: null,
    setupMinutes: null,
    finishingMinutes: null,
    returns: [],
    declaration: "ENTRY_ERROR",
    effectiveDate: date(),
    reason: "Uma peça não foi impressa",
  });
  expect(
    await db.$transaction((tx) => unclaimed(tx, f.order.lines[0].id)),
  ).toBe(9);
  const current = await db.$transaction((tx) => batchDTO(tx, b.id));
  const payload = {
    ...(await planningMeta(current.version)),
    batchId: b.id,
    reason:
      "Conferência física: uma peça não executada, material remanescente conferido",
    releases: [{ participationId: b.participants[0].id, units: 1 }],
    materialReleases: [{ coverageId: b.coverage[0].id, quantity: "100" }],
  };
  await releaseBatchRemainder(f.actor, payload);
  await releaseBatchRemainder(f.actor, payload);
  expect(
    await db.$transaction((tx) => unclaimed(tx, f.order.lines[0].id)),
  ).toBe(10);
  expect((await scheduledBatch(f, 10)).state).toBe("SCHEDULED");
  expect(await db.productionEvent.count({ where: { kind: "REPORT" } })).toBe(1);
});
it("retains coverage after physical closure until audited material disposition", async () => {
  const f = await planningFixture();
  let a = await scheduledBatch(f, 5);
  a = await setBatchCoverage(f.actor, {
    ...(await planningMeta(a.version)),
    batchId: a.id,
    colorAvailabilityConfirmed: true,
    needs: [{ participationId: a.participants[0].id, quantity: "100" }],
    allocations: [
      {
        participationId: a.participants[0].id,
        allocationId: f.allocation.id,
        quantity: "100",
      },
    ],
  });
  const { scheduleBatch } = await import("@/server/planning/batches");
  a = await scheduleBatch(f.actor, {
    ...(await planningMeta(a.version)),
    batchId: a.id,
  });
  await close(f, a);
  await expect(scheduledBatch(f, 5)).rejects.toThrow(/Parcela/);
});
it("deducts explicitly linked consumption while printing and links supplemental time without settling more pieces", async () => {
  const f = await planningFixture();
  let a = await scheduledBatch(f, 5);
  const b = await scheduledBatch(f, 5);
  for (const kind of ["PREPARE_START", "PRINT_START"])
    a = await recordMilestone(f.actor, {
      ...(await planningMeta(a.version)),
      batchId: a.id,
      kind,
      instant: new Date().toISOString(),
    });
  const report = {
    lineId: f.order.lines[0].id,
    planningParticipationId: a.participants[0].id,
    executorId: f.actor.id,
    printerId: f.printer.id,
    goodUnits: 0,
    failedUnits: 5,
    machineMinutes: "30",
    setupMinutes: "5",
    finishingMinutes: "0",
    materialComplete: true,
    timeComplete: true,
    materials: [
      {
        itemId: f.material.id,
        quantity: "50",
        reservationAllocationId: f.allocation.id,
      },
    ],
    effectiveDate: date(),
    reason: "Falha com consumo medido",
  };
  const o = await recordProduction(f.actor, {
    ...meta(f.order.version),
    ...report,
  });
  expect(
    (await db.planningBatch.findUniqueOrThrow({ where: { id: b.id } })).state,
  ).toBe("SCHEDULED");
  await recordProduction(f.actor, {
    ...meta(o.version),
    ...report,
    goodUnits: 0,
    failedUnits: 0,
    machineMinutes: "30",
    setupMinutes: "0",
    materials: [],
  });
  expect(
    await db.planningReportLink.count({
      where: { participationId: a.participants[0].id },
    }),
  ).toBe(2);
  expect(
    (
      await db.planningParticipation.findUniqueOrThrow({
        where: { id: a.participants[0].id },
      })
    ).settledUnits,
  ).toBe(5);
});
