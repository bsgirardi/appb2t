import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { readyFixture, key } from "./consignment-fixtures";
import { readSaleSources } from "@/server/profitability/sources";
import { calculateSale } from "@/domain/profitability/calculate";
import { reconcileProductiveLine } from "@/domain/profitability/productive-reconciliation";
import { executeCustodyCommand } from "@/server/consignment/custody";
setupDatabase();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-28T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());
it.each(["PRODUCTION", "OPENING"] as const)(
  "preserves %s attribution and does not charge custody loss as manufacturing failure",
  async (kind) => {
    const f = await readyFixture();
    if (kind === "PRODUCTION") {
      const order = await db.productionOrder.create({
        data: {
          origin: "STOCK",
          status: "CONCLUIDA",
          lines: {
            create: {
              productId: f.product.id,
              description: "Peça E22",
              technology: "FDM",
              targetUnits: 20,
            },
          },
        },
        include: { lines: true },
      });
      const event = await db.productionEvent.create({
        data: {
          lineId: order.lines[0].id,
          kind: "REPORT",
          goodUnits: 20,
          failedUnits: 2,
          reason: "Falhas incorporadas",
          machineMinutes: "60",
          setupMinutes: "60",
          finishingMinutes: "0",
          materialComplete: true,
          timeComplete: true,
          actorId: f.actor.id,
          effectiveDate: new Date("2026-10-27"),
          premises: {
            printer: {
              watts: "0",
              acquisitionCost: "200",
              amortizationMonths: 1,
              daysPerMonth: 1,
              hoursPerDay: "1",
            },
            settings: {
              values: {
                energyRate: "0",
                maintenancePerHour: "0",
                laborPerHour: "400",
              },
            },
          },
        },
      });
      await db.finishedOrigin.update({
        where: { id: f.origin.id },
        data: {
          kind,
          lineId: order.lines[0].id,
          eventId: event.id,
          initialValue: null,
        },
      });
      await db.finishedMovement.updateMany({
        where: { originId: f.origin.id, kind: "OPENING" },
        data: { kind: "PRODUCTION" },
      });
    }
    const sale = await f.makeSale();
    const before = (
      await db.$transaction((tx) => readSaleSources(tx, [sale.saleId!]))
    )[0];
    expect(before.lines[0].actual.total).toBe(
      kind === "PRODUCTION" ? "30" : "10",
    );
    expect(before.lines[0].actual.sources).toMatchObject([
      { kind: "CONSIGNMENT_SOLD" },
    ]);
    expect(before.lines[0].frozenCommission).toBe("20.00");
    if (kind === "PRODUCTION") {
      expect(before.lines[0].actual.components).toMatchObject({
        labor: "20",
        depreciation: "10",
      });
      expect(calculateSale(before).actual.productive.value).toBe("20");
    } else expect(before.lines[0].actual.components).toBeNull();
    await executeCustodyCommand(f.actor, {
      type: "LOSS",
      operationKey: key(),
      id: f.shipment.id,
      expectedVersion: f.shipment.version,
      effectiveDate: "2026-10-28",
      reason: "Perda de custódia sintética",
      stage: "partner",
      allocations: [{ shipmentAllocationId: f.allocationId, units: 1 }],
    });
    const after = (
      await db.$transaction((tx) => readSaleSources(tx, [sale.saleId!]))
    )[0];
    expect(after.lines[0].actual.total).toBe(before.lines[0].actual.total);
    expect(after.lines[0].actual.components).toEqual(
      before.lines[0].actual.components,
    );
    const value = calculateSale(after);
    expect(
      reconcileProductiveLine(value.lines[0], value.administrative)
        .includedLosses,
    ).toEqual([]);
  },
);
