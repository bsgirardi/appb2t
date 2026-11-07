import { describe, expect, it } from "vitest";
import { taxProfileSchema, taxPremiseSchema } from "@/domain/tax/validation";
import { resolveTaxProfile, assertProfilePeriod } from "@/domain/tax/periods";
import { calculateTax } from "@/domain/tax/calculate";

const profile = {
  id: "r1",
  revision: 1,
  regime: "SIMPLES" as const,
  startsAt: "2026-11",
  endsAt: "2026-12",
  percent: "4",
  monthlyDas: null,
  scope: "Venda de produtos sem exceções",
  productsConfirmed: true,
  channelsReviewed: true,
  source: "Orientação validada",
  checkedOn: "2026-11-07",
  verification: "INFORMED" as const,
  reason: "Configuração inicial",
  replacesId: null,
};
describe("perfil fiscal por vigência", () => {
  it("não inventa alíquota, exige fim e valida calendário real", () => {
    expect(taxProfileSchema.safeParse(profile).success).toBe(true);
    for (const change of [
      { percent: undefined },
      { endsAt: "" },
      { startsAt: "2026-13" },
      { checkedOn: "2026-02-30" },
      { productsConfirmed: false },
    ])
      expect(
        taxProfileSchema.safeParse({ ...profile, ...change }).success,
      ).toBe(false);
  });
  it("separa MEI fixo de percentual e exige mês inicial anterior ao final", () => {
    expect(
      taxProfileSchema.safeParse({
        ...profile,
        regime: "MEI",
        monthlyDas: "87.05",
        percent: null,
      }).success,
    ).toBe(true);
    expect(
      taxProfileSchema.safeParse({
        ...profile,
        regime: "MEI",
        monthlyDas: "87.05",
      }).success,
    ).toBe(false);
    expect(
      taxProfileSchema.safeParse({ ...profile, endsAt: "2026-10" }).success,
    ).toBe(false);
  });
  it("resolve fronteiras e substituição explícita sem alterar revisões antigas", () => {
    const rows = [
      profile,
      { ...profile, id: "r2", revision: 2, percent: "5", replacesId: "r1" },
    ];
    expect(resolveTaxProfile(rows, "2026-10")).toBeNull();
    expect(resolveTaxProfile(rows, "2026-11")?.id).toBe("r2");
    expect(resolveTaxProfile(rows, "2026-12")?.id).toBe("r2");
    expect(resolveTaxProfile(rows, "2027-01")).toBeNull();
    expect(profile.percent).toBe("4");
    expect(() =>
      assertProfilePeriod([profile], {
        ...profile,
        id: "r2",
        replacesId: null,
      }),
    ).toThrow(/sobrep/);
    expect(() =>
      assertProfilePeriod([profile], {
        ...profile,
        id: "r2",
        replacesId: "r1",
      }),
    ).not.toThrow();
  });
});
describe("componente tributário gerencial", () => {
  const premise = taxPremiseSchema.parse({
    algorithm: 1,
    competence: "2026-11",
    operation: "PRODUCT",
    profile: {
      id: "r1",
      revision: 1,
      regime: "SIMPLES",
      startsAt: "2026-11",
      endsAt: "2026-12",
      percent: "4",
      scope: profile.scope,
    },
  });
  it("arredonda em centavos por linha e mantém base explícita", () => {
    expect(calculateTax("100", premise)).toMatchObject({
      amount: "4.00",
      base: "100",
      coverage: "ESTIMATED",
    });
    expect(
      calculateTax("0.125", {
        ...premise,
        profile: { ...premise.profile!, percent: "4" },
      }).amount,
    ).toBe("0.01");
  });
  it("não confunde legado, ausência, operação diferente e vigência com isenção", () => {
    expect(calculateTax("100", undefined).amount).toBeNull();
    expect(
      calculateTax("100", { ...premise, profile: null }).amount,
    ).toBeNull();
    expect(
      calculateTax("100", { ...premise, operation: "OTHER" }).amount,
    ).toBeNull();
    expect(
      calculateTax("100", { ...premise, competence: "2027-01" }).amount,
    ).toBeNull();
  });
  it("MEI não converte DAS em taxa por venda nem publica seu valor mensal", () => {
    const mei = {
      ...premise,
      profile: { ...premise.profile!, regime: "MEI" as const, percent: null },
    };
    expect(calculateTax("100", mei)).toMatchObject({
      amount: "0.00",
      coverage: "ESTIMATED",
    });
    expect(calculateTax("1000000", mei).amount).toBe("0.00");
  });
});
