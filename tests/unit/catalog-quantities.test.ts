import { expect, it } from "vitest";
import Decimal from "decimal.js";
import type { Product } from "@prisma/client";
import {
  quantityBasePrice,
  quantityTiersSchema,
} from "@/domain/products/quantity-pricing";
import { configuredPrice } from "@/domain/products/configuration-price";
import { emptyProductConfiguration } from "@/domain/products/configuration";
import { inquiryItemSchema, mergeInquiryItem } from "@/domain/products/inquiry";
import { calculateKitPrice } from "@/domain/kits/pricing";
import { kitPriceSchema } from "@/domain/kits/selection";
import { validateProduct } from "@/domain/products/validation";
import {
  productConfigurationForSave,
  nextCommercialRevision,
} from "@/server/product-commercial";
import { productInput } from "../fixtures/product";

it.each([99, 100, 1000, 100000])(
  "accepts %i units in pricing and inquiry payloads",
  (quantity) => {
    expect(quantityBasePrice("20.00", quantity, [])).toBe("20.00");
    expect(inquiryItemSchema.parse({ productId: "p", quantity }).quantity).toBe(
      quantity,
    );
  },
);
it.each([0, -1, 1.5, 100001, NaN, Infinity])(
  "rejects invalid quantity %s at domain boundaries",
  (quantity) => {
    expect(() => quantityBasePrice("20.00", quantity, [])).toThrow();
    expect(
      inquiryItemSchema.safeParse({ productId: "p", quantity }).success,
    ).toBe(false);
  },
);
it("keeps the last tier for large quantities and adds customization per unit", () => {
  expect(
    quantityTiersSchema.parse([{ minQuantity: 100000, baseUnitPrice: "16" }])[0]
      .minQuantity,
  ).toBe(100000);
  const configuration = {
    ...emptyProductConfiguration,
    fields: [
      {
        id: "name",
        label: "Nome",
        help: "",
        required: true,
        type: "SHORT_TEXT" as const,
        maxLength: 120,
        effect: { kind: "ADD" as const, amount: "2.00" },
      },
    ],
  };
  expect(
    configuredPrice({
      mode: "REFERENCE",
      basePrice: "20.00",
      configuration,
      answers: [{ fieldId: "name", value: "Ana" }],
      quantity: 100,
      quantityTiers: [{ minQuantity: 100, baseUnitPrice: "16.00" }],
    }),
  ).toEqual({ kind: "REFERENCE", unit: "18.00", subtotal: "1800.00" });
  expect(
    quantityBasePrice("20.00", 100000, [
      { minQuantity: 100, baseUnitPrice: "16.00" },
    ]),
  ).toBe("16.00");
});
it("rejects an overflowing merge without changing the original selection", () => {
  const item = { productId: "p", quantity: 100000 };
  const rows = [item];
  expect(() => mergeInquiryItem(rows, { ...item, quantity: 1 })).toThrow();
  expect(rows).toEqual([{ productId: "p", quantity: 100000 }]);
  expect(
    mergeInquiryItem([{ ...item, quantity: 99999 }], {
      ...item,
      quantity: 1,
    })[0].quantity,
  ).toBe(100000);
});
it("calculates and serializes the largest 20-line kit without reducing quantities", () => {
  const lines = Array.from({ length: 20 }, () => ({
    quantity: 100000,
    price: { kind: "REFERENCE" as const, unit: "1.00", subtotal: "100000.00" },
  }));
  const result = calculateKitPrice(lines, [
    { minQuantity: 2000000, kind: "PERCENT", percent: "10" },
  ]);
  expect(result).toMatchObject({
    quantity: 2000000,
    subtotal: "2000000.00",
    discount: "200000.00",
    total: "1800000.00",
  });
  expect(kitPriceSchema.parse(result).quantity).toBe(2000000);
});
it("validates the product minimum and preserves it for older update clients", () => {
  expect(
    validateProduct({ ...productInput, minimumQuantity: 5 }),
  ).toHaveProperty("minimumQuantity", 5);
  for (const minimumQuantity of [0, 1.5, 100001])
    expect(() =>
      validateProduct({ ...productInput, minimumQuantity }),
    ).toThrow();
  const old = {
    ...productInput,
    price: new Decimal("75.00"),
    publicPriceMode: "REFERENCE",
    commercialRevision: 2,
    configuration: {},
    quantityTiers: [],
    minimumQuantity: 5,
  } as unknown as Product;
  const input = { ...productInput, images: [] };
  productConfigurationForSave(input, [], old);
  expect(input).toHaveProperty("minimumQuantity", 5);
  expect(nextCommercialRevision(old, input)).toBe(2);
  expect(nextCommercialRevision(old, { ...input, minimumQuantity: 6 })).toBe(3);
});
