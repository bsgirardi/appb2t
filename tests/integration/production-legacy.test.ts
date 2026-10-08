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
