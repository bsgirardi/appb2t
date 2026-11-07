import { expect, it } from "vitest";
import { assessSaleTax } from "@/domain/tax/sale";
import type { TaxPremise } from "@/domain/tax/types";
const tax: TaxPremise = {
  algorithm: 1,
  competence: "2026-11",
  operation: "PRODUCT",
  profile: {
    id: "r1",
    revision: 1,
    regime: "SIMPLES",
    startsAt: "2026-11",
    endsAt: "2026-11",
    percent: "4",
    scope: "Produtos",
  },
};
const lines = [
  { key: "a", position: 0, gross: "100", tax },
  { key: "b", position: 1, gross: "100", tax },
];
it("rateia desconto e soma imposto em centavos sem incluir frete como se coberto", () => {
  expect(assessSaleTax(lines, "10", "0", "2026-11")).toMatchObject({
    knownAmount: "7.60",
    complete: true,
    uncoveredBase: "0.00",
  });
  expect(assessSaleTax(lines, "10", "5", "2026-11")).toMatchObject({
    knownAmount: "7.60",
    complete: false,
    uncoveredBase: "5.00",
  });
});
it("conversão posterior não troca perfil congelado e ausência não vira zero imposto", () => {
  expect(assessSaleTax(lines, "0", "0", "2026-12")).toMatchObject({
    knownAmount: "0.00",
    complete: false,
    uncoveredBase: "200.00",
  });
  expect(
    assessSaleTax([{ ...lines[0], tax: undefined }], "0", "0", "2026-11")
      .complete,
  ).toBe(false);
  expect(
    assessSaleTax(
      [{ ...lines[0], tax: { ...tax, operation: "OTHER" } }],
      "0",
      "0",
      "2026-11",
    ).complete,
  ).toBe(false);
});
it("memória continua igual depois de mudar configuração externa", () => {
  const memory = JSON.stringify(assessSaleTax(lines, "0", "0", "2026-11"));
  const changed = { ...tax, profile: { ...tax.profile!, percent: "10" } };
  assessSaleTax([{ ...lines[0], tax: changed }], "0", "0", "2026-11");
  expect(JSON.stringify(assessSaleTax(lines, "0", "0", "2026-11"))).toBe(
    memory,
  );
});
