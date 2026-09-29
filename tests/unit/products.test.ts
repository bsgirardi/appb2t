import { expect, it } from "vitest";
import {
  validateProduct,
  suggestedProductPrice,
  parseFinalPrice,
} from "@/domain/products/validation";
import { calculation, productInput } from "../fixtures/product";
it("uses the existing formula and rounds the published price", () => {
  expect(suggestedProductPrice(calculation)).toBe("48.19");
  expect(validateProduct({ ...productInput, price: "75,00" }).price).toBe(
    "75.00",
  );
  expect(
    validateProduct({
      ...productInput,
      calculation: { ...calculation, consumption: "100,5" },
    }).calculation.consumption,
  ).toBe("100.5");
});
it.each([
  { name: "" },
  { description: "" },
  { paymentTerms: "" },
  { price: "0" },
  { price: "-1" },
  { price: "1.001" },
  { price: "10000000000000000" },
  { name: "x".repeat(121) },
  { description: "x".repeat(5001) },
  { paymentTerms: "x".repeat(1001) },
])("rejects invalid presentation or injected price %j", (change) => {
  expect(() => validateProduct({ ...productInput, ...change })).toThrow();
});
it("rejects invalid calculator data and prices exceeding database precision", () => {
  expect(() =>
    validateProduct({
      ...productInput,
      calculation: { ...calculation, minutes: 60 },
    }),
  ).toThrow();
  expect(() =>
    suggestedProductPrice({
      ...calculation,
      materialPrice: "999999999999",
      settings: { ...calculation.settings, markupPercent: "999999999999" },
    }),
  ).toThrow();
});
it("normalizes final prices without floating point loss", () => {
  expect(parseFinalPrice("9999999999999999,99")).toBe("9999999999999999.99");
  expect(parseFinalPrice("75,00")).toBe("75.00");
});
