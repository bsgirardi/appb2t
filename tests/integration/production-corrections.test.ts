import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { meta, sale, date } from "../fixtures/production";
import { saveOrder, releaseOrder } from "@/server/production/orders";
import { recordProduction } from "@/server/production/reports";
import { correctProduction } from "@/server/production/corrections";
import { releaseFinished } from "@/server/production/fulfillment";
setupDatabase();
it("requires resolving committed pieces before reversing production and never erases the original event", async () => {
  const a = await seedUser(),
    s = await sale();
  let o = await saveOrder(a, {
    ...meta(),
    origin: "SALE",
    saleId: s.id,
    lines: [
      {
        saleLineKey: "line1",
        description: "Peça",
        technology: "FDM",
        targetUnits: 2,
      },
    ],
  });
  o = await releaseOrder(a, { ...meta(o.version), orderId: o.id });
  o = await recordProduction(a, {
    ...meta(o.version),
    lineId: o.lines[0].id,
    executorId: a.id,
    manualStage: true,
    goodUnits: 2,
    failedUnits: 0,
    machineMinutes: null,
    setupMinutes: "10",
    finishingMinutes: "0",
    timeComplete: true,
    materialComplete: true,
    materials: [],
    effectiveDate: date(),
  });
  const source = await db.productionEvent.findFirstOrThrow({
    where: { kind: "REPORT" },
  });
  const input = {
    ...meta(o.version),
    sourceEventId: source.id,
    goodUnitsToReverse: 1,
    failedUnitsToReverse: 0,
    machineMinutes: null,
    setupMinutes: "0",
    finishingMinutes: "0",
    returns: [],
    declaration: "ENTRY_ERROR",
    effectiveDate: date(),
    reason: "Uma peça contada a mais",
  };
  await expect(correctProduction(a, input)).rejects.toThrow();
  const c = await db.finishedCommitment.findFirstOrThrow(),
    stock = await db.finishedStock.findFirstOrThrow();
  await releaseFinished(a, {
    ...meta(stock.version),
    commitmentId: c.id,
    units: 1,
    reason: "Corrigir contagem",
  });
  o = await correctProduction(a, input);
  expect(o.lines[0].goodUnits).toBe(1);
  expect(
    (await db.productionEvent.findUniqueOrThrow({ where: { id: source.id } }))
      .goodUnits,
  ).toBe(2);
  expect(
    (await db.finishedMovement.aggregate({ _sum: { units: true } }))._sum.units,
  ).toBe(1);
  await expect(
    correctProduction(a, {
      ...input,
      ...meta(o.version),
      goodUnitsToReverse: 2,
    }),
  ).rejects.toThrow();
});

it("returns material to its original identity and keeps untouched measured times complete", async () => {
  const { saveStockItem, openInventory } =
    await import("@/server/stock/catalog");
  const { refreshProductionCosts } = await import("@/server/production/costs");
  const a = await seedUser(),
    s = await sale();
  let item = await saveStockItem(a, {
    ...meta(),
    name: "PLA",
    unit: "G",
    method: "MANUAL",
    manualUnitCost: "1",
  });
  item = await openInventory(a, {
    ...meta(item.version),
    itemId: item.id,
    quantity: "20",
    value: "20",
    effectiveDate: date(),
  });
  const identity = await db.stockIdentity.create({
    data: { itemId: item.id, label: "Carretel A" },
  });
  let o = await saveOrder(a, {
    ...meta(),
    origin: "SALE",
    saleId: s.id,
    lines: [
      {
        saleLineKey: "line1",
        description: "Peça",
        technology: "FDM",
        targetUnits: 1,
      },
    ],
  });
  o = await releaseOrder(a, { ...meta(o.version), orderId: o.id });
  o = await recordProduction(a, {
    ...meta(o.version),
    lineId: o.lines[0].id,
    executorId: a.id,
    manualStage: true,
    goodUnits: 0,
    failedUnits: 1,
    machineMinutes: null,
    setupMinutes: "0",
    finishingMinutes: "0",
    timeComplete: true,
    materialComplete: true,
    materials: [
      {
        itemId: item.id,
        quantity: "5",
        allocations: [{ identityId: identity.id, quantity: "5" }],
      },
    ],
    effectiveDate: date(),
    reason: "Consumo identificado conferido",
  });
  const source = await db.productionEvent.findFirstOrThrow({
    where: { kind: "REPORT" },
    include: { materialLinks: true },
  });
  o = await correctProduction(a, {
    ...meta(o.version),
    sourceEventId: source.id,
    goodUnitsToReverse: 0,
    failedUnitsToReverse: 0,
    machineMinutes: null,
    setupMinutes: null,
    finishingMinutes: null,
    returns: [{ linkId: source.materialLinks[0].id, quantity: "2" }],
    declaration: "PHYSICAL_MATERIAL_RETURN",
    effectiveDate: date(),
    reason: "Sobra física devolvida",
  });
  const returned = await db.stockMovement.findFirstOrThrow({
    where: { kind: "RETURN_CONSUMPTION" },
    include: { allocations: true },
  });
  expect(
    returned.allocations.map((x) => ({
      identityId: x.identityId,
      quantity: x.quantity.toFixed(),
    })),
  ).toEqual([{ identityId: identity.id, quantity: "2" }]);
  expect((await refreshProductionCosts(a, o.id))[0]).toMatchObject({
    total: "3",
    missing: [],
  });
});
