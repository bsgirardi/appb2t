import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { readyFixture, key } from "./fixtures";
import { raceUnderPlanningLock } from "./race";
import {
  executeCustodyCommand,
  allocationBalance,
} from "@/server/consignment/custody";
import { executeConsignmentSaleCommand } from "@/server/consignment/sales";
import {
  previewStatement,
  executeStatementCommand,
} from "@/server/consignment/statements";
import { reserveFinished } from "@/server/production/fulfillment";
setupDatabase();
it("serializes two sales consuming the last partner balance", async () => {
  const f = await readyFixture(),
    a = await f.draftSale(8),
    b = await f.draftSale(8);
  const results = await raceUnderPlanningLock([
    () =>
      executeConsignmentSaleCommand(f.actor, {
        type: "CONFIRM",
        operationKey: key(),
        id: a.id,
        expectedVersion: a.version,
        reason: "",
      }),
    () =>
      executeConsignmentSaleCommand(f.actor, {
        type: "CONFIRM",
        operationKey: key(),
        id: b.id,
        expectedVersion: b.version,
        reason: "",
      }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect((await allocationBalance(db, f.allocationId)).sold).toBe(8);
  expect(await db.sale.count()).toBe(1);
  expect(await db.financialEntry.count()).toBe(1);
});
it.each(["LOSS", "RETURN"] as const)(
  "serializes a sale against %s without negative custody",
  async (type) => {
    const f = await readyFixture(),
      sale = await f.draftSale(8);
    const results = await raceUnderPlanningLock([
      () =>
        executeConsignmentSaleCommand(f.actor, {
          type: "CONFIRM",
          operationKey: key(),
          id: sale.id,
          expectedVersion: sale.version,
          reason: "",
        }),
      () =>
        executeCustodyCommand(f.actor, {
          type,
          operationKey: key(),
          id: f.shipment.id,
          expectedVersion: f.shipment.version,
          effectiveDate: "2026-10-28",
          stage: "partner",
          reason: "Disputa sintética",
          allocations: [{ shipmentAllocationId: f.allocationId, units: 8 }],
        }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const b = await allocationBalance(db, f.allocationId);
    expect(b.partner).toBe(0);
    expect(b.sold + b.lost + b.inbound).toBe(8);
  },
);
it("closes each sale into at most one active statement", async () => {
  const f = await readyFixture();
  await f.makeSale();
  const preview = await previewStatement(f.actor, f.partner.id, "2026-10");
  const payload = {
    type: "CLOSE",
    partnerId: f.partner.id,
    competence: "2026-10",
    fingerprint: preview.fingerprint,
  };
  const results = await raceUnderPlanningLock([
    () => executeStatementCommand(f.actor, { ...payload, operationKey: key() }),
    () => executeStatementCommand(f.actor, { ...payload, operationKey: key() }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(
    await db.consignmentStatementLine.count({ where: { active: true } }),
  ).toBe(1);
  expect(await db.financialEntry.count()).toBe(1);
});
it("shares the finished-stock lock with a normal sale reservation", async () => {
  const f = await readyFixture(); // 12 remain internally after the first shipment.
  const shipment = await executeCustodyCommand(f.actor, {
    type: "SAVE_DRAFT",
    operationKey: key(),
    expectedVersion: 0,
    partnerId: f.partner.id,
    notes: "",
    lines: [
      {
        productId: f.product.id,
        allocations: [{ originId: f.origin.id, units: 10 }],
      },
    ],
  });
  const sale = await db.sale.create({
    data: {
      customerId: f.customer.id,
      status: "CONFIRMADA",
      fulfillmentMode: "U3",
      document: {},
      totals: { total: "1000" },
      items: {
        create: {
          position: 0,
          lineKey: "line",
          productId: f.product.id,
          description: "Peças",
          quantity: 10,
          unitPrice: "100",
        },
      },
    },
  });
  const stock = await db.finishedStock.findUniqueOrThrow({
    where: { id: f.stock.id },
  });
  const results = await raceUnderPlanningLock([
    () =>
      executeCustodyCommand(f.actor, {
        type: "DISPATCH",
        operationKey: key(),
        id: shipment.id,
        expectedVersion: shipment.version,
        effectiveDate: "2026-10-28",
        reason: "Disputa",
      }),
    () =>
      reserveFinished(f.actor, {
        operationKey: key(),
        expectedVersion: stock.version,
        saleVersion: sale.version,
        saleId: sale.id,
        lineKey: "line",
        stockId: f.stock.id,
        units: 10,
        originAllocations: [{ originId: f.origin.id, units: 10 }],
      }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
});
