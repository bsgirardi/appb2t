import { expect, it } from "vitest";
import {
  quantityBasePrice,
  quantityTiersSchema,
} from "@/domain/products/quantity-pricing";
import { configuredPrice } from "@/domain/products/configuration-price";
import type { ProductConfiguration } from "@/domain/products/configuration";
const configuration: ProductConfiguration = {
  formatVersion: 1,
  included: "",
  leadTimeCondition: "",
  fields: [
    {
      id: "name",
      type: "SHORT_TEXT",
      label: "Nome",
      help: "",
      required: true,
      maxLength: 120,
      effect: { kind: "ADD", amount: "2.00" },
    },
  ],
};
const tiers = [{ minQuantity: 10, baseUnitPrice: "18.00" }];
it("applies_base_tier_before_additions", () => {
  const price = (quantity: number, name: string) =>
    configuredPrice({
      mode: "REFERENCE",
      basePrice: "20.00",
      configuration,
      answers: [{ fieldId: "name", value: name }],
      quantity,
      quantityTiers: tiers,
    });
  expect(price(5, "Ana")).toEqual({
    kind: "REFERENCE",
    unit: "22.00",
    subtotal: "110.00",
  });
  expect(price(5, "Bia")).toEqual({
    kind: "REFERENCE",
    unit: "22.00",
    subtotal: "110.00",
  });
  expect(price(10, "Ana")).toEqual({
    kind: "REFERENCE",
    unit: "20.00",
    subtotal: "200.00",
  });
  expect(
    configuredPrice({
      mode: "REFERENCE",
      basePrice: "20.00",
      configuration,
      answers: [{ fieldId: "name", value: "Ana" }],
      quantity: 10,
    }),
  ).toEqual({ kind: "REFERENCE", unit: "22.00", subtotal: "220.00" });
});
it("chooses_largest_eligible_minimum_not_lowest_price", () => {
  expect(
    quantityBasePrice("20.00", 10, [
      ...tiers,
      { minQuantity: 5, baseUnitPrice: "17.00" },
    ]),
  ).toBe("18.00");
  expect(quantityBasePrice("20.00", 9, tiers)).toBe("20.00");
});
it("rejects_invalid_individual_tiers_and_money", () => {
  for (const rows of [
    [{ minQuantity: 0, baseUnitPrice: "1" }],
    [{ minQuantity: 100001, baseUnitPrice: "1" }],
    [...tiers, ...tiers],
    [{ minQuantity: 1, baseUnitPrice: "0" }],
    [{ minQuantity: 1, baseUnitPrice: "1.005" }],
    Array.from({ length: 11 }, (_, i) => ({
      minQuantity: i + 1,
      baseUnitPrice: "1",
    })),
  ])
    expect(quantityTiersSchema.safeParse(rows).success).toBe(false);
  expect(() => quantityBasePrice("99999999999999999.99", 1, [])).toThrow();
});
it("consult_remains_null_even_with_tier", () => {
  expect(
    configuredPrice({
      mode: "CONSULT",
      basePrice: null,
      configuration,
      answers: [{ fieldId: "name", value: "Ana" }],
      quantity: 10,
      quantityTiers: tiers,
    }),
  ).toEqual({ kind: "CONSULT", unit: null, subtotal: null });
});
