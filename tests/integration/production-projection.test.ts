import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { meta, sale, date } from "../fixtures/production";
import { saveOrder, releaseOrder } from "@/server/production/orders";
import { recordProduction } from "@/server/production/reports";
setupDatabase();
it("projects sale progress from released production and actual good pieces", async () => {
  const a = await seedUser(),
    s = await sale(undefined, 2);
  let o = await saveOrder(a, {
    ...meta(),
    origin: "SALE",
    saleId: s.id,
    lines: [
      {
        saleLineKey: "line1",
        description: "Avulsa",
        technology: "FDM",
        targetUnits: 2,
      },
    ],
  });
  o = await releaseOrder(a, { ...meta(o.version), orderId: o.id });
  expect(
    (await db.sale.findUniqueOrThrow({ where: { id: s.id } })).status,
  ).toBe("EM_PRODUCAO");
  await recordProduction(a, {
    ...meta(o.version),
    lineId: o.lines[0].id,
    executorId: a.id,
    manualStage: true,
    goodUnits: 2,
    failedUnits: 0,
    machineMinutes: null,
    setupMinutes: null,
    finishingMinutes: null,
    timeComplete: false,
    materialComplete: false,
    materials: [],
    effectiveDate: date(),
  });
  expect(
    (await db.sale.findUniqueOrThrow({ where: { id: s.id } })).status,
  ).toBe("PRONTA");
  expect(await db.financialEntry.count()).toBe(0);
});
