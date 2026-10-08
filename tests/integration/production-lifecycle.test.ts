import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { meta, sale, date } from "../fixtures/production";
import { saveOrder, releaseOrder } from "@/server/production/orders";
import { recordProduction } from "@/server/production/reports";
import {
  completeOrder,
  cancelOrderRemainder,
} from "@/server/production/lifecycle";
import { cancelSale, transitionSale } from "@/server/sales";
setupDatabase();
it("closes only fulfilled goals and keeps consumed execution when canceling remainder", async () => {
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
  await expect(
    completeOrder(a, { ...meta(o.version), orderId: o.id }),
  ).rejects.toThrow();
  o = await recordProduction(a, {
    ...meta(o.version),
    lineId: o.lines[0].id,
    executorId: a.id,
    manualStage: true,
    goodUnits: 1,
    failedUnits: 1,
    machineMinutes: null,
    setupMinutes: "3",
    finishingMinutes: null,
    materialComplete: false,
    timeComplete: false,
    materials: [],
    effectiveDate: date(),
    reason: "Falha",
  });
  const op = await seedUser("OPERATOR", "operator@example.test");
  await expect(
    cancelOrderRemainder(op, {
      ...meta(o.version),
      orderId: o.id,
      lines: [{ lineId: o.lines[0].id, unitsToCancel: 1, dispositions: [] }],
      reason: "Cancelar restante",
    }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  const origin = await db.finishedOrigin.findFirstOrThrow();
  o = await cancelOrderRemainder(a, {
    ...meta(o.version),
    orderId: o.id,
    lines: [
      {
        lineId: o.lines[0].id,
        unitsToCancel: 1,
        dispositions: [{ originId: origin.id, units: 1, action: "KEEP_SALE" }],
      },
    ],
    reason: "Cancelar restante",
  });
  expect(o.lines[0]).toMatchObject({
    goodUnits: 1,
    failedUnits: 1,
    canceledUnits: 1,
  });
  expect(await db.productionEvent.count()).toBeGreaterThan(1);
  const current = await db.sale.findUniqueOrThrow({ where: { id: s.id } });
  await expect(
    cancelSale(a, s.id, current.version, "Cancelar venda"),
  ).rejects.toThrow();
  await expect(
    transitionSale(a, s.id, current.version, "EM_PRODUCAO"),
  ).rejects.toThrow();
});
