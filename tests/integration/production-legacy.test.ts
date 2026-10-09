import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { meta, sale } from "../fixtures/production";
import { adoptSaleProduction } from "@/server/production/legacy";
setupDatabase();
it("recognizes only explicitly counted legacy pieces without fabricating material consumption", async () => {
  const a = await seedUser(),
    s = await sale();
  await db.sale.update({
    where: { id: s.id },
    data: { fulfillmentMode: "LEGACY", status: "PRONTA" },
  });
  expect(await db.finishedOrigin.count()).toBe(0);
  await adoptSaleProduction(a, {
    ...meta(s.version),
    saleId: s.id,
    lines: [
      {
        saleItemId: s.items[0].id,
        lineKey: "line1",
        recognizedReadyUnits: 3,
        recognizedDeliveredUnits: 0,
      },
    ],
    reason: "Contagem e conciliação",
  });
  expect(
    (await db.finishedMovement.aggregate({ _sum: { units: true } }))._sum.units,
  ).toBe(3);
  expect(await db.stockMovement.count()).toBe(0);
  expect((await db.finishedOrigin.findFirstOrThrow()).initialValue).toBeNull();
  expect(
    (await db.sale.findUniqueOrThrow({ where: { id: s.id } })).fulfillmentMode,
  ).toBe("U3");
});

it("adopts catalog goods from counted inventory without duplicating physical pieces", async () => {
  const { product, date } = await import("../fixtures/production");
  const { saveFinishedStock, openFinishedStock } =
    await import("@/server/production/finished-stock");
  const { listFinished } = await import("@/server/production/queries");
  const a = await seedUser(),
    p = await product(),
    s = await sale(p.id);
  await db.sale.update({
    where: { id: s.id },
    data: { fulfillmentMode: "LEGACY" },
  });
  const stock = await saveFinishedStock(a, { ...meta(), productId: p.id });
  await openFinishedStock(a, {
    ...meta(stock.version),
    stockId: stock.id,
    units: 4,
    value: "40",
    effectiveDate: date(),
  });
  await adoptSaleProduction(a, {
    ...meta(s.version),
    saleId: s.id,
    reason: "Conciliação física",
    lines: [
      {
        saleItemId: s.items[0].id,
        recognizedReadyUnits: 3,
        recognizedDeliveredUnits: 2,
      },
    ],
  });
  const current = (await listFinished(a)).items[0];
  expect(current).toMatchObject({
    physical: "4",
    reserved: "3",
    available: "1",
  });
  expect(
    (await db.productionDeliveryLine.aggregate({ _sum: { units: true } }))._sum
      .units,
  ).toBe(2);
});

it("refuses final legacy delivery recognition while material is still reserved", async () => {
  const a = await seedUser(),
    s = await sale();
  await db.sale.update({
    where: { id: s.id },
    data: { fulfillmentMode: "LEGACY" },
  });
  const item = await db.stockItem.create({
    data: { name: "PLA", unit: "G", method: "MANUAL", manualUnitCost: "1" },
  });
  await db.stockReservation.create({
    data: {
      saleId: s.id,
      lineKey: "line1",
      itemId: item.id,
      events: { create: { kind: "RESERVE", quantity: "100", actorId: a.id } },
    },
  });
  await expect(
    adoptSaleProduction(a, {
      ...meta(s.version),
      saleId: s.id,
      reason: "Conciliação final",
      lines: [
        {
          saleItemId: s.items[0].id,
          recognizedReadyUnits: 0,
          recognizedDeliveredUnits: 10,
        },
      ],
    }),
  ).rejects.toThrow();
  expect(
    (await db.sale.findUniqueOrThrow({ where: { id: s.id } })).fulfillmentMode,
  ).toBe("LEGACY");
});
