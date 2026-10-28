import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { meta, sale, date, product } from "../fixtures/production";
import { saveOrder, releaseOrder, demand } from "@/server/production/orders";
import { recordProduction } from "@/server/production/reports";
import { correctProduction } from "@/server/production/corrections";
import {
  releaseFinished,
  reserveFinished,
} from "@/server/production/fulfillment";
import { cancelOrderRemainder } from "@/server/production/lifecycle";
import {
  saveFinishedStock,
  openFinishedStock,
} from "@/server/production/finished-stock";
setupDatabase();
it("does not reopen production demand already assigned to another order", async () => {
  const a = await seedUser(),
    s = await sale(undefined, 1);
  const draft = () =>
    saveOrder(a, {
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
  let o = await draft();
  o = await releaseOrder(a, { ...meta(o.version), orderId: o.id });
  o = await recordProduction(a, {
    ...meta(o.version),
    lineId: o.lines[0].id,
    executorId: a.id,
    manualStage: true,
    goodUnits: 1,
    failedUnits: 0,
    machineMinutes: null,
    setupMinutes: "0",
    finishingMinutes: "0",
    timeComplete: true,
    materialComplete: true,
    materials: [],
    effectiveDate: date(),
  });
  const c = await db.finishedCommitment.findFirstOrThrow(),
    stock = await db.finishedStock.findFirstOrThrow(),
    event = await db.productionEvent.findFirstOrThrow({
      where: { kind: "REPORT" },
    });
  await releaseFinished(a, {
    ...meta(stock.version),
    commitmentId: c.id,
    units: 1,
    reason: "Replanejamento",
  });
  const other = await draft();
  await releaseOrder(a, { ...meta(other.version), orderId: other.id });
  await expect(
    correctProduction(a, {
      ...meta(o.version),
      sourceEventId: event.id,
      goodUnitsToReverse: 1,
      failedUnitsToReverse: 0,
      machineMinutes: null,
      setupMinutes: null,
      finishingMinutes: null,
      returns: [],
      declaration: "ENTRY_ERROR",
      effectiveDate: date(),
      reason: "Correção da contagem",
    }),
  ).rejects.toThrow();
  expect(
    (await db.$transaction((tx) => demand(tx, s.id, "line1"))).remaining,
  ).toBe(0);
  expect(
    await db.productionEvent.count({ where: { kind: "CORRECTION" } }),
  ).toBe(0);
});
it("reads dependencies after locking when a sale reserves during cancellation", async () => {
  const a = await seedUser(),
    p = await product(),
    s = await sale(p.id, 1);
  let stock = await saveFinishedStock(a, { ...meta(), productId: p.id });
  stock = await openFinishedStock(a, {
    ...meta(stock.version),
    stockId: stock.id,
    units: 0,
    value: null,
    effectiveDate: date(),
  });
  let o = await saveOrder(a, {
    ...meta(),
    origin: "STOCK",
    lines: [
      {
        productId: p.id,
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
    goodUnits: 1,
    failedUnits: 0,
    machineMinutes: null,
    setupMinutes: "0",
    finishingMinutes: "0",
    timeComplete: true,
    materialComplete: true,
    materials: [],
    effectiveDate: date(),
  });
  const origin = await db.finishedOrigin.findFirstOrThrow({
      where: { lineId: o.lines[0].id },
    }),
    current = await db.finishedStock.findUniqueOrThrow({
      where: { id: stock.id },
    });
  let unlock!: () => void, locked!: () => void;
  let observeWaiters!: () => Promise<{ n: bigint }[]>;
  const gate = new Promise<void>((r) => (unlock = r)),
    ready = new Promise<void>((r) => (locked = r));
  const blocker = db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "FinishedStock" WHERE id=${stock.id} FOR UPDATE`;
      observeWaiters = async () => {
        await tx.$executeRaw`SELECT pg_stat_clear_snapshot()`;
        return tx.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND (query LIKE '%FinishedStock%' OR query LIKE '%PlanningState%')`;
      };
      locked();
      await gate;
    },
    { timeout: 15000 },
  );
  await ready;
  const waitBlocked = async (n: number) => {
    for (let i = 0; i < 100; i++) {
      const rows = await observeWaiters();
      if (Number(rows[0].n) >= n) return;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw Error("Expected waiting transactions");
  };
  let outcomes: PromiseSettledResult<unknown>[] = [];
  let pending: Promise<PromiseSettledResult<unknown>[]> | undefined;
  try {
    const reserve = reserveFinished(a, {
      ...meta(current.version),
      saleVersion: s.version,
      saleId: s.id,
      lineKey: "line1",
      stockId: stock.id,
      units: 1,
      originAllocations: [{ originId: origin.id, units: 1 }],
    });
    pending = Promise.allSettled([reserve]);
    await waitBlocked(1);
    const cancel = cancelOrderRemainder(a, {
      ...meta(o.version),
      orderId: o.id,
      lines: [
        {
          lineId: o.lines[0].id,
          unitsToCancel: 0,
          dispositions: [{ originId: origin.id, units: 1, action: "LOSS" }],
        },
      ],
      reason: "Perda em conferência",
    });
    const both = pending = Promise.allSettled([reserve, cancel]);
    await waitBlocked(2);
    unlock();
    await blocker;
    outcomes = await both;
  } finally {
    unlock();
    try {
      await blocker;
    } finally {
      await pending;
    }
  }
  expect(outcomes.map((x) => x.status)).toEqual(["fulfilled", "rejected"]);
  expect(
    (await db.finishedMovement.aggregate({ _sum: { units: true } }))._sum.units,
  ).toBe(1);
});

it("keeps planned machine premises from release when the catalog later changes", async () => {
  const a = await seedUser(),
    s = await sale(undefined, 1);
  const printer = await db.printer.create({
    data: {
      name: "FDM",
      technology: "FDM",
      acquisitionCost: "1000",
      amortizationMonths: 12,
      daysPerMonth: 20,
      hoursPerDay: "8",
      watts: "100",
    },
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
        plannedPrinterId: printer.id,
      },
    ],
  });
  o = await releaseOrder(a, { ...meta(o.version), orderId: o.id });
  await db.printer.update({
    where: { id: printer.id },
    data: { watts: "200", acquisitionCost: "2000", version: { increment: 1 } },
  });
  await recordProduction(a, {
    ...meta(o.version),
    lineId: o.lines[0].id,
    executorId: a.id,
    printerId: printer.id,
    goodUnits: 1,
    failedUnits: 0,
    machineMinutes: "60",
    setupMinutes: "0",
    finishingMinutes: "0",
    timeComplete: true,
    materialComplete: true,
    materials: [],
    effectiveDate: date(),
  });
  const e = await db.productionEvent.findFirstOrThrow({
    where: { kind: "REPORT" },
  });
  expect(e.premises).toMatchObject({
    printer: { watts: "100", acquisitionCost: "1000", version: 1 },
  });
});
it("keeps own-sale pieces restricted until an explicit administrative stock disposition", async () => {
  const a = await seedUser(),
    p = await product(),
    s = await sale(p.id, 1),
    other = await sale(p.id, 1);
  let stock = await saveFinishedStock(a, { ...meta(), productId: p.id });
  stock = await openFinishedStock(a, {
    ...meta(stock.version),
    stockId: stock.id,
    units: 0,
    value: null,
    effectiveDate: date(),
  });
  let o = await saveOrder(a, {
    ...meta(),
    origin: "SALE",
    saleId: s.id,
    lines: [
      {
        saleLineKey: "line1",
        productId: p.id,
        description: "Personalizada",
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
    goodUnits: 1,
    failedUnits: 0,
    machineMinutes: null,
    setupMinutes: "0",
    finishingMinutes: "0",
    timeComplete: true,
    materialComplete: true,
    materials: [],
    effectiveDate: date(),
  });
  const c = await db.finishedCommitment.findFirstOrThrow(),
    current = await db.finishedStock.findUniqueOrThrow({
      where: { id: stock.id },
    });
  stock = await releaseFinished(a, {
    ...meta(current.version),
    commitmentId: c.id,
    units: 1,
    reason: "Conferência antes de corrigir",
  });
  const payload = {
    ...meta(stock.version),
    saleVersion: other.version,
    saleId: other.id,
    lineKey: "line1",
    stockId: stock.id,
    units: 1,
    originAllocations: [{ originId: c.originId, units: 1 }],
  };
  await expect(reserveFinished(a, payload)).rejects.toThrow();
  const legacy = await sale(p.id, 1);
  await db.sale.update({
    where: { id: legacy.id },
    data: { fulfillmentMode: "LEGACY" },
  });
  const { adoptSaleProduction } = await import("@/server/production/legacy");
  await expect(
    adoptSaleProduction(a, {
      ...meta(legacy.version),
      saleId: legacy.id,
      reason: "Contagem conciliada",
      lines: [
        {
          saleItemId: legacy.items[0].id,
          recognizedReadyUnits: 1,
          recognizedDeliveredUnits: 0,
        },
      ],
    }),
  ).rejects.toThrow();
  await cancelOrderRemainder(a, {
    ...meta(o.version),
    orderId: o.id,
    lines: [
      {
        lineId: o.lines[0].id,
        unitsToCancel: 0,
        dispositions: [
          { originId: c.originId, units: 1, action: "RELEASE_STOCK" },
        ],
      },
    ],
    reason: "Peça genérica conferida para estoque",
  });
  const next = await db.finishedStock.findUniqueOrThrow({
    where: { id: stock.id },
  });
  await expect(
    reserveFinished(a, { ...payload, ...meta(next.version) }),
  ).resolves.toMatchObject({ reserved: "1" });
});
