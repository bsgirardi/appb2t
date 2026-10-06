import { expect, it } from "vitest";
import { toBaseQuantity, stockState } from "@/domain/stock/quantities";
it("converts package units without changing dimension", () => {
  expect(toBaseQuantity("1.5", "KG", "G")).toBe("1500");
  expect(toBaseQuantity("0.25", "L", "ML")).toBe("250");
  expect(() => toBaseQuantity("1", "L", "G")).toThrow();
});
it("rejects fractions for discrete units and excessive precision", () => {
  expect(() => toBaseQuantity("1.5", "UNIT", "UNIT")).toThrow();
  expect(() => toBaseQuantity("0.0000001", "G", "G")).toThrow();
  expect(() => toBaseQuantity("9999999999999999999", "G", "G")).toThrow();
  expect(() => toBaseQuantity("-1", "G", "G")).toThrow();
});
it("keeps deficit separate from reserved stock", () => {
  expect(stockState("700", "900")).toEqual({
    physical: "700",
    reserved: "900",
    available: "-200",
    shortage: "200",
  });
  expect(stockState("1200", "900").shortage).toBe("0");
});
