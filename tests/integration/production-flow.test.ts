import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { meta, sale, date } from "../fixtures/production";
import { saveOrder, releaseOrder } from "@/server/production/orders";
import { recordProduction } from "@/server/production/reports";
import { recordDelivery } from "@/server/production/deliveries";
import { completeOrder } from "@/server/production/lifecycle";
import { saleProduction } from "@/server/production/queries";
import { demand } from "@/server/production/orders";
setupDatabase();
it("fulfills ten sold pieces through split orders, failure, partial delivery and reprint", async () => {
  const a = await seedUser(),
    s = await sale();
  await db.sale.update({
    where: { id: s.id },
    data: {
      document: { agreed: "original" },
      snapshot: { price: "100" },
      totals: { total: "100" },
    },
  });
  await db.saleInstallment.create({
    data: {
      saleId: s.id,
      number: 1,
      amount: "100",
      dueDate: new Date("2026-12-01"),
    },
  });
  const commercial = await db.sale.findUniqueOrThrow({
    where: { id: s.id },
    select: {
      document: true,
      snapshot: true,
      totals: true,
      installments: true,
    },
  });
  const create = async (targetUnits: number) => {
    const draft = await saveOrder(a, {
      ...meta(),
      origin: "SALE",
      saleId: s.id,
      lines: [
        {
          saleLineKey: "line1",
          description: "Peça avulsa",
          technology: "FDM",
          targetUnits,
        },
      ],
    });
    return releaseOrder(a, { ...meta(draft.version), orderId: draft.id });
  };
  let first = await create(6),
    second = await create(4);
  const report = async (
    o: typeof first,
    goodUnits: number,
    failedUnits = 0,
    reprintOf?: string,
  ) =>
    recordProduction(a, {
      ...meta(o.version),
      lineId: o.lines[0].id,
      executorId: a.id,
      manualStage: true,
      goodUnits,
      failedUnits,
      reprintOf,
      machineMinutes: null,
      setupMinutes: "0",
      finishingMinutes: "0",
      timeComplete: true,
      materialComplete: true,
      materials: [],
      effectiveDate: date(),
      reason: failedUnits ? "Falha de adesão" : undefined,
    });
  first = await report(first, 5, 1);
  const failure = await db.productionEvent.findFirstOrThrow({
    where: { lineId: first.lines[0].id, kind: "REPORT" },
  });
  const deliver = async (units: number) => {
    const current = await saleProduction(a, s.id);
    let left = units;
    const allocations = current.lines[0].commitments.flatMap((c) => {
      const count = Math.min(left, c.remaining);
      left -= count;
      return count ? [{ commitmentId: c.id, units: count }] : [];
    });
    return recordDelivery(a, {
      ...meta(current.version),
      saleId: s.id,
      lines: [{ lineKey: "line1", allocations }],
      effectiveDate: date(),
    });
  };
  await deliver(3);
  first = await report(first, 1, 0, failure.id);
  second = await report(second, 4);
  first = await completeOrder(a, { ...meta(first.version), orderId: first.id });
  await completeOrder(a, { ...meta(second.version), orderId: second.id });
  expect(first.lines[0]).toMatchObject({ goodUnits: 6, failedUnits: 1 });
  expect(
    (await db.$transaction((tx) => demand(tx, s.id, "line1"))).remaining,
  ).toBe(0);
  await deliver(7);
  expect(
    (await db.sale.findUniqueOrThrow({ where: { id: s.id } })).status,
  ).toBe("ENTREGUE");
  expect(
    (await db.finishedMovement.aggregate({ _sum: { units: true } }))._sum.units,
  ).toBe(0);
  expect(
    (await db.finishedCommitmentEvent.aggregate({ _sum: { units: true } }))._sum
      .units,
  ).toBe(0);
  expect(
    await db.sale.findUniqueOrThrow({
      where: { id: s.id },
      select: {
        document: true,
        snapshot: true,
        totals: true,
        installments: true,
      },
    }),
  ).toEqual(commercial);
  expect(await db.cashMovement.count()).toBe(0);
  expect(await db.financialEntry.count()).toBe(0);
});
