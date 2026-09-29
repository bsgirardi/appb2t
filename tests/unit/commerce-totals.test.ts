import { expect, it } from "vitest";
import { calculateDocumentTotals } from "@/domain/commerce/totals";
import { parseMoney } from "@/domain/commerce/validation";
const item = { description: "Peça", quantity: 2, unitPrice: "10,50" };
it("calculates negotiated quantities, discount and shipping exactly", () => {
  expect(
    calculateDocumentTotals(
      [item, { ...item, quantity: 1, unitPrice: "5.00" }],
      "1",
      "3",
    ),
  ).toEqual({
    subtotal: "26.00",
    discount: "1.00",
    shipping: "3.00",
    total: "28.00",
  });
  expect(parseMoney("9999999999999999,99")).toBe("9999999999999999.99");
  expect(parseMoney("-2.25", { signed: true })).toBe("-2.25");
});
it("rejects impossible totals and invalid amounts", () => {
  for (const value of ["NaN", "Infinity", "-1", "1.001", "10000000000000000"])
    expect(() => parseMoney(value)).toThrow();
  for (const quantity of [0, 1.5, 100001])
    expect(() =>
      calculateDocumentTotals([{ ...item, quantity }], "0", "0"),
    ).toThrow();
  expect(() =>
    calculateDocumentTotals(Array(101).fill(item), "0", "0"),
  ).toThrow();
  expect(() => calculateDocumentTotals([item], "22", "0")).toThrow();
  expect(() => calculateDocumentTotals([item], "21", "0")).toThrow();
  expect(() =>
    calculateDocumentTotals(
      [{ ...item, unitPrice: "9999999999999999.99" }],
      "0",
      "0",
    ),
  ).toThrow();
});
