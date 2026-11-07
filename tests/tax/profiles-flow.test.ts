import { beforeEach, afterAll, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { assertTaxDatabase } from "./database";
import { pricingFixture } from "../fixtures/pricing-db";
import { saveTaxProfile, getTaxProfiles } from "@/server/tax/profiles";
import { getPricingCatalog } from "@/server/pricing/catalog";
import {
  createPricingEstimate,
  getPricingSnapshot,
} from "@/server/pricing/estimates";
import { saveCustomer } from "@/server/customers";
import { confirmSale, saveSaleDraft } from "@/server/sales";
import {
  getTaxReport,
  saveTaxMemory,
  getTaxMemory,
} from "@/server/tax/reports";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { calculatePricing } from "@/domain/pricing/calculate-fiscal";
import { readyFixture } from "../e5/fixtures";
import { saveQuote, transitionQuote } from "@/server/quotes";
import { convertQuote } from "@/server/sales";
const month = todaySaoPaulo(new Date()).slice(0, 7);
const values = {
  regime: "MEI",
  startsAt: month,
  endsAt: month,
  percent: null,
  monthlyDas: "87.05",
  scope: "Produtos sem exceções",
  source: "Responsável sintético privado",
  checkedOn: `${month}-01`,
  verification: "CHECKED",
  productsConfirmed: true,
  channelsReviewed: true,
  reason: "Configuração sintética inicial",
  replacesId: null,
  expectedVersion: 0,
};
beforeEach(async () => {
  assertTaxDatabase();
  const tables = await db.$queryRaw<
    { tablename: string }[]
  >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations'`;
  await db.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => '"' + t.tablename.replaceAll('"', '""') + '"').join(",")} CASCADE`,
  );
  await db.financialCategory.create({
    data: {
      id: "system-sale-revenue",
      name: "Receita",
      kind: "REVENUE",
      systemCode: "SALE_REVENUE",
    },
  });
});
afterAll(() => db.$disconnect());
it("venda consignada nova aparece no mês da confirmação com cobertura parcial explícita", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-28T12:00:00Z"));
  try {
    const f = await readyFixture();
    const result = await f.makeSale();
    const sale = await db.sale.findUniqueOrThrow({
      where: { id: result.saleId! },
    });
    expect(sale.taxConfirmedAt).not.toBeNull();
    const report = await getTaxReport(f.actor, "2026-10");
    expect(
      report.rows.some(
        (r) =>
          r.saleId === sale.id && !r.complete && r.uncoveredBase === "100.00",
      ),
    ).toBe(true);
  } finally {
    vi.useRealTimers();
  }
});
it("recusa OPERATOR, sobreposição e revisão concorrente sem alterar histórico", async () => {
  const { actor } = await pricingFixture();
  await expect(
    saveTaxProfile({ ...actor, role: "OPERATOR" }, values),
  ).rejects.toThrow(/administradores/);
  const results = await Promise.allSettled([
    saveTaxProfile(actor, values),
    saveTaxProfile(actor, values),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const saved = await getTaxProfiles(actor),
    original = JSON.stringify(saved.profiles[0]);
  await expect(
    saveTaxProfile(actor, { ...values, expectedVersion: 1 }),
  ).rejects.toThrow(/sobrep/);
  expect((await getTaxProfiles(actor)).version).toBe(1);
  const next = await saveTaxProfile(actor, {
    ...values,
    expectedVersion: 1,
    replacesId: saved.profiles[0].id,
    monthlyDas: "82.05",
    reason: "Substituição explícita sintética",
  });
  expect(next.profiles).toHaveLength(2);
  expect(JSON.stringify(next.profiles[0])).toBe(original);
  expect(await db.financialEntry.count()).toBe(0);
  expect(await db.cashMovement.count()).toBe(0);
});
it("catálogo mínimo, snapshot com fonte privada separada e idempotência", async () => {
  const f = await pricingFixture();
  const profiles = await saveTaxProfile(f.actor, values);
  const operator = { ...f.actor, role: "OPERATOR" as const };
  const catalog = await getPricingCatalog(operator);
  expect(JSON.stringify(catalog.tax)).not.toContain("87.05");
  expect(JSON.stringify(catalog.tax)).not.toContain(values.source);
  const request = {
    ...f.request,
    tax: {
      competence: month,
      operation: "PRODUCT",
      expectedVersion: profiles.version,
    },
  };
  const key = randomUUID(),
    snap = await createPricingEstimate(operator, request, key);
  expect(snap.result.tax?.amount).toBe("0.00");
  const raw = await db.pricingSnapshot.findUniqueOrThrow({
    where: { id: snap.id },
  });
  expect(JSON.stringify(raw.taxEvidence)).toContain(values.source);
  expect(JSON.stringify(snap)).not.toContain(values.source);
  const frozen = JSON.stringify(raw);
  await saveTaxProfile(f.actor, {
    ...values,
    replacesId: profiles.profiles[0].id,
    expectedVersion: 1,
    regime: "SIMPLES",
    monthlyDas: null,
    percent: "4",
    reason: "Mudança sintética de regime",
  });
  expect((await createPricingEstimate(operator, request, key)).id).toBe(
    snap.id,
  );
  expect(
    JSON.stringify(
      await db.pricingSnapshot.findUniqueOrThrow({ where: { id: snap.id } }),
    ),
  ).toBe(frozen);
  expect(
    (await getPricingSnapshot(db, snap.id)).input.tax?.profile?.regime,
  ).toBe("MEI");
  await expect(
    createPricingEstimate(operator, request, randomUUID()),
  ).rejects.toThrow(/alterado/);
  expect(await db.financialEntry.count()).toBe(0);
  expect(await db.settlement.count()).toBe(0);
});
it("financeiro preserva consulta salva e não deduz previsão em títulos/caixa", async () => {
  const f = await pricingFixture();
  const profiles = await saveTaxProfile(f.actor, {
    ...values,
    regime: "SIMPLES",
    monthlyDas: null,
    percent: "4",
  });
  const snap = await createPricingEstimate(
    f.actor,
    {
      ...f.request,
      tax: { competence: month, operation: "PRODUCT", expectedVersion: 1 },
    },
    randomUUID(),
  );
  const customer = await saveCustomer(f.actor, undefined, {
    name: "Cliente sintético",
    type: "PERSON",
    active: true,
    notes: "",
  });
  const lineId = randomUUID();
  const draft = await saveSaleDraft(f.actor, undefined, {
    customerId: customer.id,
    items: [
      {
        lineId,
        description: "Produto sintético",
        quantity: 10,
        unitPrice: "10",
      },
    ],
    discount: "0",
    shipping: "0",
    paymentTerms: "Pix",
    internalNotes: "",
    costBindings: [{ lineId, snapshotId: snap.id }],
  });
  await confirmSale(
    f.actor,
    draft.id,
    draft.version,
    [{ number: 1, amount: "100", dueDate: `${month}-28` }],
    randomUUID(),
  );
  const sale = await db.sale.findUniqueOrThrow({ where: { id: draft.id } });
  expect(sale.taxConfirmedAt).not.toBeNull();
  const report = await getTaxReport(f.actor, month);
  expect(report.knownSalesTax).toBe("4.00");
  expect(report.completeSales).toBe(1);
  const financeBefore = JSON.stringify(await db.financialEntry.findMany());
  const saved = await saveTaxMemory(f.actor, {
    competence: month,
    operationKey: randomUUID(),
    expectedFingerprint: report.fingerprint,
  });
  const memory = await getTaxMemory(f.actor, saved.id);
  await saveTaxProfile(f.actor, {
    ...values,
    replacesId: profiles.profiles[0].id,
    expectedVersion: 1,
    monthlyDas: "82.05",
    reason: "Perfil atual modificado",
  });
  expect((await getTaxMemory(f.actor, saved.id)).result).toEqual(memory.result);
  expect((await getTaxReport(f.actor, month)).knownSalesTax).toBe("4.00");
  expect(JSON.stringify(await db.financialEntry.findMany())).toBe(
    financeBefore,
  );
  expect(await db.cashMovement.count()).toBe(0);
  await expect(
    getTaxMemory({ ...f.actor, role: "OPERATOR" }, saved.id),
  ).rejects.toThrow(/administradores/);
  await db.sale.update({
    where: { id: draft.id },
    data: { status: "CANCELADA" },
  });
  expect((await getTaxReport(f.actor, month)).knownSalesTax).toBe("0.00");
  expect((await getTaxMemory(f.actor, saved.id)).result.knownSalesTax).toBe(
    "4.00",
  );
});
it("salvar exige a consulta conferida e detecta mudança concorrente", async () => {
  const { actor } = await pricingFixture();
  await saveTaxProfile(actor, values);
  const report = await getTaxReport(actor, month);
  await saveTaxProfile(actor, {
    ...values,
    replacesId: report.monthlyProfile!.id,
    expectedVersion: 1,
    monthlyDas: "82.05",
    reason: "Revisão concorrente sintética",
  });
  await expect(
    saveTaxMemory(actor, {
      competence: month,
      operationKey: randomUUID(),
      expectedFingerprint: report.fingerprint,
    }),
  ).rejects.toThrow(/alterad|atualiz/i);
});
it("legado permanece byte a byte e usa o algoritmo original", async () => {
  const f = await pricingFixture(),
    snap = await createPricingEstimate(f.actor, f.request, randomUUID());
  const before = await db.pricingSnapshot.findUniqueOrThrow({
    where: { id: snap.id },
  });
  await saveTaxProfile(f.actor, values);
  const after = await db.pricingSnapshot.findUniqueOrThrow({
    where: { id: snap.id },
  });
  expect(after.input).toEqual(before.input);
  expect(after.result).toEqual(before.result);
  expect(calculatePricing(snap.input)).toEqual(snap.result);
  expect(after.taxEvidence).toBeNull();
});
it("orçamento convertido noutra competência conserva premissa e documento emitido sem resolver perfil novo", async () => {
  const f = await pricingFixture();
  await saveTaxProfile(f.actor, {
    ...values,
    regime: "SIMPLES",
    monthlyDas: null,
    percent: "4",
  });
  const snapshot = await createPricingEstimate(
    f.actor,
    {
      ...f.request,
      tax: { competence: month, operation: "PRODUCT", expectedVersion: 1 },
    },
    randomUUID(),
  );
  const customer = await saveCustomer(f.actor, undefined, {
    name: "Cliente sintético de orçamento",
    type: "PERSON",
    active: true,
    notes: "",
  });
  const lineId = randomUUID();
  let quote = await saveQuote(f.actor, undefined, {
    customerId: customer.id,
    validUntil: "2099-12-31",
    items: [
      { lineId, description: "Item sintético", quantity: 10, unitPrice: "10" },
    ],
    discount: "0",
    shipping: "0",
    paymentTerms: "Pix",
    internalNotes: "",
    costBindings: [{ lineId, snapshotId: snapshot.id }],
  });
  quote = await transitionQuote(f.actor, quote.id, quote.version, "ISSUE");
  quote = await transitionQuote(f.actor, quote.id, quote.version, "APPROVE");
  const emitted = JSON.stringify(
    (await db.quote.findUniqueOrThrow({ where: { id: quote.id } })).snapshot,
  );
  const nextDate = new Date(`${month}-15T12:00:00Z`);
  nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
  const originalRaw = JSON.stringify(
    (await db.pricingSnapshot.findUniqueOrThrow({ where: { id: snapshot.id } }))
      .input,
  );
  const nextMonth = todaySaoPaulo(nextDate).slice(0, 7);
  await saveTaxProfile(f.actor, {
    ...values,
    expectedVersion: 1,
    startsAt: nextMonth,
    endsAt: nextMonth,
    regime: "SIMPLES",
    monthlyDas: null,
    percent: "10",
    reason: "Novo período sintético",
  });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(nextDate);
  try {
    const sale = await convertQuote(
      f.actor,
      quote.id,
      quote.version,
      [{ number: 1, amount: "100", dueDate: `${nextMonth}-28` }],
      randomUUID(),
    );
    expect(sale.costs?.snapshots[0].input.tax?.profile?.percent).toBe("4");
    expect(
      (await getTaxReport(f.actor, nextMonth)).rows.find(
        (r) => r.saleId === sale.id,
      ),
    ).toMatchObject({
      complete: false,
      knownAmount: "0.00",
      uncoveredBase: "100.00",
    });
    expect(
      JSON.stringify(
        (await db.quote.findUniqueOrThrow({ where: { id: quote.id } }))
          .snapshot,
      ),
    ).toBe(emitted);
    expect(
      JSON.stringify(
        (
          await db.pricingSnapshot.findUniqueOrThrow({
            where: { id: snapshot.id },
          })
        ).input,
      ),
    ).toBe(originalRaw);
  } finally {
    vi.useRealTimers();
  }
});
