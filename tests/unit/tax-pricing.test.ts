import { expect, it } from "vitest";
import { calculatePricing } from "@/domain/pricing/calculate-fiscal";
import { calculateV2 } from "@/domain/pricing/calculate";
import { lotFixture } from "../fixtures/pricing";
import type { PricingV2Input } from "@/domain/pricing/types";
import { calculateSale } from "@/domain/profitability/calculate";
import { completeInput } from "../fixtures/profitability";
import { previewComparison } from "@/domain/pricing/comparisons/calculate";
const input: PricingV2Input = {
  ...lotFixture,
  mode: "INFORMED",
  informedUnitPrice: "100",
  quantity: 1,
  materials: [
    { ...lotFixture.materials[0], consumptionPerUnit: "600", fixedWaste: "0" },
  ],
  energyRate: "0",
  maintenancePerHour: "0",
  setupMinutes: "0",
  finishingMinutesPerUnit: "0",
  laborPerHour: "0",
  extras: [],
  machineFixedMinutes: "600",
  channel: {
    ...lotFixture.channel,
    fees: [{ label: "Cartão", percent: "5" }],
    fixedCost: "0",
  },
  tax: {
    algorithm: 1,
    competence: "2026-11",
    operation: "PRODUCT",
    profile: {
      id: "p1",
      revision: 1,
      regime: "SIMPLES",
      startsAt: "2026-11",
      endsAt: "2026-12",
      percent: "4",
      scope: "Venda de produtos",
    },
  },
};
it("mantém V2 byte a byte e discrimina o algoritmo novo", () => {
  expect(calculatePricing(lotFixture)).toEqual(calculateV2(lotFixture));
});
it("separa tributo de cartão e não muda preço informado nem custos produtivos", () => {
  const r = calculatePricing(input);
  expect(r.offeredRevenue).toBe("100");
  expect(r.fees).toBe("5");
  expect(r.variableCost).toBe("60");
  expect(r.depreciation).toBe("10");
  expect(r.tax).toMatchObject({
    amount: "4.00",
    contribution: "31",
    afterDepreciation: "21",
    margin: "31",
  });
  expect(r.contribution).toBe("31");
  expect(r.afterDepreciation).toBe("21");
});
it("inclui alíquota no denominador e aplica imposto sobre oferta arredondada", () => {
  const r = calculatePricing({
    ...input,
    mode: "MARKUP",
    markupPercent: "100",
  });
  expect(r.offeredUnitPrice).toBe("153.85");
  expect(r.tax?.amount).toBe("6.15");
});
it("rejeita denominador inviável e não promete total fiscal para serviço", () => {
  expect(() =>
    calculatePricing({
      ...input,
      mode: "CONTRIBUTION",
      targetMarginPercent: "91",
    }),
  ).toThrow(/100|inviável/);
  const r = calculatePricing({
    ...input,
    tax: { ...input.tax!, operation: "OTHER" },
  });
  expect(r.tax?.amount).toBeNull();
  expect(r.tax?.contribution).toBeNull();
});
it("comparação de preço informado explica cobertura impossível quando taxas e tributo somam 100% ou mais", () => {
  const channel = {
    ...input.channel,
    id: "c",
    version: 1,
    active: true,
    fees: [{ label: "Comissão", percent: "70" }],
  };
  const tax = {
    ...input.tax!,
    profile: { ...input.tax!.profile!, percent: "40" },
  };
  const comparison = previewComparison(
    { ...input, tax },
    [channel],
    { kind: "COMMON", unitPrice: "100" },
    [{ channelRef: { id: "c", version: 1 }, discountPercent: "0" }],
  );
  expect(comparison.alternatives[0].status).toBe("INVALID");
  if (comparison.alternatives[0].status === "INVALID")
    expect(comparison.alternatives[0].message).toMatch(/cobertura|100/i);
});
it("preço de cobertura respeita o arredondamento do tributo em centavos com custos fracionários", () => {
  const fractional = {
    ...input,
    materials: [{ ...input.materials[0], consumptionPerUnit: "0.14" }],
    printer: { ...input.printer, acquisitionCost: "0" },
    tax: { ...input.tax!, profile: { ...input.tax!.profile!, percent: "50" } },
  };
  const channel = {
    ...input.channel,
    id: "c",
    version: 1,
    active: true,
    fees: [],
  };
  const comparison = previewComparison(
    fractional,
    [channel],
    { kind: "COMMON", unitPrice: "100" },
    [{ channelRef: { id: "c", version: 1 }, discountPercent: "0" }],
  );
  expect(comparison.alternatives[0].status).toBe("VALID");
  if (comparison.alternatives[0].status === "VALID") {
    const price = comparison.alternatives[0].value.metrics.coverageUnitPrice;
    const actual = calculatePricing({
      ...fractional,
      channel: { ...fractional.channel, fees: [] },
      informedUnitPrice: price,
    });
    expect(Number(actual.afterDepreciation)).toBeGreaterThanOrEqual(0);
  }
});
it("rentabilidade separa estimativa tributária de custos realizados sem alterar indicador histórico", () => {
  const sale = completeInput();
  sale.taxCompetence = "2026-11";
  sale.lines[0].expected!.tax = input.tax;
  const r = calculateSale(sale);
  expect(r.actual.contribution.value).toBe("90");
  expect(r.taxSummary?.knownAmount).toBe("8.00");
  expect(r.taxSummary?.actualContributionAfter).toBe("82");
  expect(r.taxSummary?.complete).toBe(true);
  sale.taxCompetence = "2027-01";
  expect(calculateSale(sale).taxSummary?.actualContributionAfter).toBeNull();
});
