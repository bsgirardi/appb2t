import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { readyFixture, key } from "./fixtures";
import { readProductionCost } from "@/server/production/cost-sources";
import { getConsignmentReport } from "@/server/consignment/reports";
import { getSaleProfitability } from "@/server/profitability/queries";
import { executeConsignmentSaleCommand } from "@/server/consignment/sales";
setupDatabase();
it("partitions productive origin cost between internal stock, custody and sales", async () => {
  const f = await readyFixture();
  const order = await db.productionOrder.create({
    data: {
      origin: "STOCK",
      status: "CONCLUIDA",
      lines: {
        create: {
          productId: f.product.id,
          description: "Peça E5",
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
      machineMinutes: "60",
      setupMinutes: "0",
      finishingMinutes: "0",
      materialComplete: true,
      timeComplete: true,
      actorId: f.actor.id,
      effectiveDate: new Date("2026-10-27T00:00:00Z"),
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
            laborPerHour: "0",
          },
        },
      },
    },
  });
  await db.finishedOrigin.update({
    where: { id: f.origin.id },
    data: {
      kind: "PRODUCTION",
      lineId: order.lines[0].id,
      eventId: event.id,
      initialValue: null,
    },
  });
  await db.finishedMovement.updateMany({
    where: { originId: f.origin.id, kind: "OPENING" },
    data: { kind: "PRODUCTION" },
  });
  const sale = await f.makeSale();
  const cost = await readProductionCost(db, order.lines[0].id);
  expect(cost.result.total).toBe("200");
  expect(
    cost.result.origins![0].allocations.find(
      (b) => b.kind === "CONSIGNMENT_SOLD",
    )?.value,
  ).toBe("10");
  const report = await getConsignmentReport(f.actor, {
    partnerId: f.partner.id,
  });
  expect(report.items[0]).toMatchObject({
    cost: "10",
    depreciation: "10",
    afterDepreciation: "70",
    contribution: "80",
    coverage: "COMPLETE",
  });
  const profitability = await getSaleProfitability(f.actor, sale.saleId!);
  expect(profitability.actual.afterDepreciation.value).toBe("70");
  expect(profitability.actual.contribution.value).toBe("80");
  await executeConsignmentSaleCommand(f.actor, {
    type: "CANCEL",
    operationKey: key(),
    id: sale.id,
    expectedVersion: sale.version,
    reason: "Correção sintética",
  });
  const after = await readProductionCost(db, order.lines[0].id);
  expect(
    after.result.origins![0].allocations.some(
      (b) => b.kind === "CONSIGNMENT_SOLD",
    ),
  ).toBe(false);
  expect(after.result.total).toBe("200");
});
it("keeps absent opening valuation unavailable rather than reporting zero cost", async () => {
  const f = await readyFixture();
  await db.finishedOrigin.update({
    where: { id: f.origin.id },
    data: { initialValue: null },
  });
  await f.makeSale();
  const report = await getConsignmentReport(f.actor, {
    partnerId: f.partner.id,
  });
  expect(report.items[0]).toMatchObject({
    cost: null,
    afterDepreciation: null,
    contribution: null,
    coverage: "PARTIAL",
  });
});
