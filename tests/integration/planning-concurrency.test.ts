import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import {
  planningFixture,
  scheduledBatch,
  planningMeta,
} from "../fixtures/planning";
import { setBatchCoverage } from "@/server/planning/materials";
import { scheduleBatch } from "@/server/planning/batches";
import { meta, date } from "../fixtures/production";
import { recordProduction } from "@/server/production/reports";
import { releaseOrderReservation } from "@/server/production/reservations";
import { updateOrderPlanning } from "@/server/production/orders";
import { savePrinter } from "@/server/catalog-inputs";
setupDatabase();
// Entry points audited: runProductionCommand, runStockCommand, cancelSale and machine/item inactivation.
it("rejects unlinked production using claimed pieces and invalidates scheduling after reserve release", async () => {
  const f = await planningFixture(),
    b = await scheduledBatch(f, 10);
  await expect(
    recordProduction(f.actor, {
      ...meta(f.order.version),
      lineId: f.order.lines[0].id,
      executorId: f.actor.id,
      printerId: f.printer.id,
      goodUnits: 1,
      failedUnits: 0,
      machineMinutes: "1",
      setupMinutes: "0",
      finishingMinutes: "0",
      materialComplete: false,
      timeComplete: true,
      materials: [],
      effectiveDate: date(),
    }),
  ).rejects.toThrow();
  const version = (
    await db.productionOrder.findUniqueOrThrow({ where: { id: f.order.id } })
  ).version;
  await releaseOrderReservation(f.actor, {
    ...meta(version),
    allocationId: f.allocation.id,
    quantity: "50",
    reason: "Revisão da reserva",
  });
  expect(
    (await db.planningBatch.findUniqueOrThrow({ where: { id: b.id } })).state,
  ).toBe("PENDING");
});
it("serializes reserve release against scheduling with different operation keys", async () => {
  const f = await planningFixture();
  let b = await scheduledBatch(f, 10);
  b = await setBatchCoverage(f.actor, {
    ...(await planningMeta(b.version)),
    batchId: b.id,
    colorAvailabilityConfirmed: true,
    needs: [{ participationId: b.participants[0].id, quantity: "100" }],
    allocations: [
      {
        participationId: b.participants[0].id,
        allocationId: f.allocation.id,
        quantity: "100",
      },
    ],
  });
  const planMeta = await planningMeta(b.version);
  const results = await Promise.allSettled([
    scheduleBatch(f.actor, { ...planMeta, batchId: b.id }),
    releaseOrderReservation(f.actor, {
      ...meta(f.order.version),
      allocationId: f.allocation.id,
      quantity: "50",
      reason: "Revisão concorrente",
    }),
  ]);
  expect(results[1].status).toBe("fulfilled");
  expect(
    (await db.planningBatch.findUniqueOrThrow({ where: { id: b.id } })).state,
  ).toBe("PENDING");
});
it("invalidates a scheduled queue when its machine is deactivated", async () => {
  const f = await planningFixture(),
    b = await scheduledBatch(f, 10);
  await savePrinter(f.actor, {
    id: f.printer.id,
    expectedVersion: 1,
    name: f.printer.name,
    technology: "FDM",
    active: false,
    acquisitionCost: "1000",
    amortizationMonths: 12,
    daysPerMonth: 20,
    hoursPerDay: "8",
    watts: "100",
  });
  expect(
    (await db.planningBatch.findUniqueOrThrow({ where: { id: b.id } })).state,
  ).toBe("PENDING");
});
it("makes incompatible replanning pending instead of retaining a stale scheduled machine", async () => {
  const f = await planningFixture(),
    b = await scheduledBatch(f, 10);
  await updateOrderPlanning(f.actor, {
    ...meta(f.order.version),
    orderId: f.order.id,
    responsibleId: f.actor.id,
    dueDate: null,
    notes: "",
    reason: "Rever máquina",
    lines: [{ lineId: f.order.lines[0].id, plannedPrinterId: null }],
  });
  const current = await db.planningBatch.findUniqueOrThrow({
    where: { id: b.id },
  });
  expect(current.state).toBe("PENDING");
  expect(current.durationConfirmedAt).toBeNull();
});
