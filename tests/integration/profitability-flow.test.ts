import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { pricingFixture } from "../fixtures/pricing-db";
import { meta, date } from "../fixtures/production";
import { adminPayload } from "../fixtures/profitability";
import { createPricingEstimate } from "@/server/pricing/estimates";
import { saveCustomer } from "@/server/customers";
import { saveQuote, transitionQuote } from "@/server/quotes";
import { convertQuote } from "@/server/sales";
import { saveOrder, releaseOrder } from "@/server/production/orders";
import { recordProduction } from "@/server/production/reports";
import { completeOrder } from "@/server/production/lifecycle";
import { recordDelivery } from "@/server/production/deliveries";
import { saleProduction } from "@/server/production/queries";
import { saveStockItem, openInventory } from "@/server/stock/catalog";
import { receivePurchase } from "@/server/stock/receipts";
import { confirmReceiptFinance } from "@/server/stock/purchase-finance";
import { getSaleProfitability } from "@/server/profitability/queries";
import { saveProfitabilityRevision } from "@/server/profitability/revisions";
import {
  recordAssessment,
  getAssessment,
} from "@/server/profitability/assessments";
import { calculateSale } from "@/domain/profitability/calculate";
setupDatabase();
it("keeps quote, sale and cash intact through partial production, reprint and late valuation", async () => {
  const f = await pricingFixture(),
    a = f.actor;
  const customer = await saveCustomer(a, undefined, {
    name: "Cliente U4",
    type: "PERSON",
    active: true,
    notes: "",
  });
  const snapshot = await createPricingEstimate(
      a,
      f.request,
      crypto.randomUUID(),
    ),
    lineKey = crypto.randomUUID();
  let q = await saveQuote(a, undefined, {
    customerId: customer.id,
    items: [
      {
        lineId: lineKey,
        description: "Peça",
        quantity: 10,
        unitPrice: "20.00",
      },
    ],
    discount: "0",
    shipping: "0",
    paymentTerms: "Pix",
    internalNotes: "",
    validUntil: "2099-12-31",
    costBindings: [{ lineId: lineKey, snapshotId: snapshot.id }],
  });
  q = await transitionQuote(a, q.id, q.version, "ISSUE");
  q = await transitionQuote(a, q.id, q.version, "APPROVE");
  const sale = await convertQuote(
    a,
    q.id,
    q.version,
    [{ number: 1, amount: "200", dueDate: "2099-12-31" }],
    crypto.randomUUID(),
  );
  const commercial = await db.sale.findUnique({
    where: { id: sale.id },
    select: {
      document: true,
      totals: true,
      snapshot: true,
      installments: true,
    },
  });
  const material = await saveStockItem(a, {
    ...meta(),
    name: "PLA real",
    unit: "G",
    method: "WEIGHTED_AVERAGE",
  });
  await openInventory(a, {
    ...meta(material.version),
    itemId: material.id,
    quantity: "0",
    effectiveDate: date(),
  });
  const receipt = await receivePurchase(a, {
    ...meta(),
    supplier: "Fornecedor",
    effectiveDate: date(),
    lines: [{ itemId: material.id, quantity: "100" }],
  });
  async function order(units: number) {
    const o = await saveOrder(a, {
      ...meta(),
      origin: "SALE",
      saleId: sale.id,
      lines: [
        {
          saleLineKey: lineKey,
          description: "Peça",
          technology: "FDM",
          targetUnits: units,
        },
      ],
    });
    return releaseOrder(a, { ...meta(o.version), orderId: o.id });
  }
  let first = await order(6),
    second = await order(4);
  async function report(
    o: typeof first,
    good: number,
    grams: string,
    failed = 0,
    reprintOf?: string,
  ) {
    return recordProduction(a, {
      ...meta(o.version),
      lineId: o.lines[0].id,
      executorId: a.id,
      manualStage: true,
      goodUnits: good,
      failedUnits: failed,
      reprintOf,
      machineMinutes: null,
      setupMinutes: "0",
      finishingMinutes: "0",
      timeComplete: true,
      materialComplete: true,
      materials: [{ itemId: material.id, quantity: grams }],
      effectiveDate: date(),
      reason: failed ? "Falha de adesão" : undefined,
    });
  }
  async function deliver(units: number) {
    const s = await saleProduction(a, sale.id);
    let left = units;
    const allocations = s.lines[0].commitments.flatMap((c) => {
      const count = Math.min(left, c.remaining);
      left -= count;
      return count ? [{ commitmentId: c.id, units: count }] : [];
    });
    return recordDelivery(a, {
      ...meta(s.version),
      saleId: sale.id,
      lines: [{ lineKey, allocations }],
      effectiveDate: date(),
    });
  }
  first = await report(first, 5, "30", 1);
  await deliver(3);
  expect(
    (await getSaleProfitability(a, sale.id)).actual.contribution.value,
  ).toBeNull();
  const failure = await db.productionEvent.findFirstOrThrow({
    where: { lineId: first.lines[0].id, kind: "REPORT" },
  });
  first = await report(first, 1, "5", 0, failure.id);
  second = await report(second, 4, "15");
  await completeOrder(a, { ...meta(first.version), orderId: first.id });
  await completeOrder(a, { ...meta(second.version), orderId: second.id });
  await deliver(7);
  let live = await getSaleProfitability(a, sale.id);
  const payload = {
    ...adminPayload(),
    fees: { state: "DECLARED" as const, value: "10" },
    shipping: { state: "DECLARED" as const, value: "20" },
    expectedShipping: { state: "DECLARED" as const, value: "20" },
    lineReviews: [
      { lineKey, sourceHash: live.lines[0].sourceHash, complete: true },
    ],
    confirmations: live.lines[0].expected!.extras.map((e) => ({
      lineKey,
      extraKey: e.key,
      kind: "NOT_OCCURRED" as const,
      reason: "Sem embalagem nesta entrega",
    })),
  };
  await saveProfitabilityRevision(a, {
    ...meta(),
    saleId: sale.id,
    effectiveDate: date(),
    reason: "Conferência de entrega",
    payload,
  });
  const before = await recordAssessment(a, {
    saleId: sale.id,
    operationKey: crypto.randomUUID(),
  });
  expect(before.result.actual.contribution.value).toBeNull();
  const category = await db.financialCategory.create({
    data: { name: "Compra", kind: "EXPENSE" },
  });
  await confirmReceiptFinance(a, {
    ...meta(1),
    receiptId: receipt.id,
    total: "20.00",
    lines: [{ id: receipt.lines[0].id, value: "20.00" }],
    mode: "CREATE",
    categoryId: category.id,
    installments: [{ number: 1, amount: "20.00", dueDate: date() }],
  });
  live = await getSaleProfitability(a, sale.id);
  expect(live.lines[0].actual.total).toBe("10");
  expect(live.actual.contribution.value).toBeNull();
  payload.lineReviews = [
    { lineKey, sourceHash: live.lines[0].sourceHash, complete: true },
  ];
  await saveProfitabilityRevision(a, {
    ...meta(1),
    saleId: sale.id,
    effectiveDate: date(),
    reason: "Revisão após valorização",
    payload,
  });
  const counts = [
    await db.stockMovement.count(),
    await db.financialEntry.count(),
    await db.cashMovement.count(),
  ];
  const after = await recordAssessment(a, {
    saleId: sale.id,
    operationKey: crypto.randomUUID(),
  });
  expect(after.result.actual.contribution.value).toBe("160");
  expect(after.result.actual.afterDepreciation.value).toBe("160");
  expect(calculateSale(before.input)).toEqual(before.result);
  expect(await getAssessment(a, before.id)).toEqual(before);
  expect([
    await db.stockMovement.count(),
    await db.financialEntry.count(),
    await db.cashMovement.count(),
  ]).toEqual(counts);
  expect(
    await db.sale.findUnique({
      where: { id: sale.id },
      select: {
        document: true,
        totals: true,
        snapshot: true,
        installments: true,
      },
    }),
  ).toEqual(commercial);
  expect(await db.productionCostRevision.count()).toBe(0);
});
