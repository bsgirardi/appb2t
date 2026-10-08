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
