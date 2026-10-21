import { expect, it } from "vitest";
import { calculateKitPrice } from "@/domain/kits/pricing";
import {
  kitDiscountTiersSchema,
  kitDefinitionSchema,
} from "@/domain/kits/validation";
import type { ConfiguredPrice } from "@/domain/products/configuration-price";
const lines: { quantity: number; price: ConfiguredPrice }[] = [
  {
    quantity: 2,
    price: { kind: "REFERENCE", unit: "30.00", subtotal: "60.00" },
  },
  {
    quantity: 3,
    price: { kind: "REFERENCE", unit: "20.00", subtotal: "60.00" },
  },
];
it("fixed_discount_once", () => {
  expect(
    calculateKitPrice(lines, [
      { minQuantity: 5, kind: "FIXED", amount: "15.00" },
    ]),
  ).toMatchObject({
    kind: "REFERENCE",
    quantity: 5,
    subtotal: "120.00",
    knownSubtotal: "120.00",
    discount: "15.00",
    total: "105.00",
  });
  expect(
    calculateKitPrice(lines, [
      { minQuantity: 5, kind: "PERCENT", percent: "10" },
    ]),
  ).toMatchObject({ discount: "12.00", total: "108.00" });
  expect(
    calculateKitPrice(lines, [
      { minQuantity: 6, kind: "FIXED", amount: "15.00" },
    ]),
  ).toMatchObject({ discount: "0.00", total: "120.00", tier: null });
});
it("consult_has_no_partial_discount", () => {
  expect(
    calculateKitPrice(
      [
        lines[0],
        { quantity: 3, price: { kind: "CONSULT", unit: null, subtotal: null } },
      ],
      [{ minQuantity: 5, kind: "FIXED", amount: "15" }],
    ),
  ).toMatchObject({
    kind: "CONSULT",
    quantity: 5,
    knownSubtotal: "60.00",
    subtotal: null,
    discount: null,
    total: null,
    tier: { kind: "FIXED", amount: "15.00" },
  });
});
it("rounds_half_up_and_rejects_excessive_discounts", () => {
  expect(
    calculateKitPrice(
      [
        {
          quantity: 1,
          price: { kind: "REFERENCE", unit: "0.05", subtotal: "0.05" },
        },
      ],
      [{ minQuantity: 1, kind: "PERCENT", percent: "10" }],
    ).discount,
  ).toBe("0.01");
  for (const amount of ["120", "121"])
    expect(() =>
      calculateKitPrice(lines, [{ minQuantity: 1, kind: "FIXED", amount }]),
    ).toThrow();
  expect(() =>
    calculateKitPrice(
      [
        {
          quantity: 2,
          price: {
            kind: "REFERENCE",
            unit: "9999999999999999.99",
            subtotal: "19999999999999999.98",
          },
        },
      ],
      [],
    ),
  ).toThrow();
  expect(() =>
    calculateKitPrice(
      [
        {
          quantity: 2,
          price: { kind: "REFERENCE", unit: "30.00", subtotal: "1.00" },
        },
      ],
      [],
    ),
  ).toThrow();
});
it("validates_kit_tier_and_definition_boundaries", () => {
  for (const row of [
    { minQuantity: 0, kind: "FIXED", amount: "1" },
    { minQuantity: 1981, kind: "FIXED", amount: "1" },
    { minQuantity: 1, kind: "PERCENT", percent: "1.005" },
    { minQuantity: 1, kind: "PERCENT", percent: "100" },
    { minQuantity: 1, kind: "FIXED", amount: "0" },
    { minQuantity: 1, kind: "FIXED", amount: "1", percent: "1" },
  ])
    expect(kitDiscountTiersSchema.safeParse([row]).success).toBe(false);
  expect(
    kitDiscountTiersSchema.safeParse([
      { minQuantity: 1980, kind: "FIXED", amount: "1" },
    ]).success,
  ).toBe(true);
  expect(
    kitDiscountTiersSchema.safeParse([
      { minQuantity: 1, kind: "FIXED", amount: "1" },
      { minQuantity: 1, kind: "PERCENT", percent: "10" },
    ]).success,
  ).toBe(false);
  const kit = {
    name: "Kit",
    description: "",
    active: true,
    position: 0,
    productIds: ["p"],
    tiers: [],
  };
  expect(kitDefinitionSchema.safeParse(kit).success).toBe(true);
  expect(
    kitDefinitionSchema.safeParse({ ...kit, productIds: [] }).success,
  ).toBe(false);
  expect(
    kitDefinitionSchema.safeParse({
      ...kit,
      productIds: Array.from({ length: 51 }, (_, i) => `p${i}`),
    }).success,
  ).toBe(false);
});
