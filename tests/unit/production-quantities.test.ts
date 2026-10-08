import { expect, it } from "vitest";
import {
  demandRemaining,
  finishedBalance,
  units,
} from "@/domain/production/quantities";
it("prevents allocating more pieces than the remaining sale demand", () => {
  expect(demandRemaining(10, 3, 2, 5)).toBe(0);
  expect(() => demandRemaining(10, 3, 2, 6)).toThrow();
});
it("keeps physical pieces separate from reservations and refuses negative availability", () => {
  expect(finishedBalance(["8", "-2"], ["5", "-2"])).toEqual({
    physical: "6",
    reserved: "3",
    available: "3",
  });
  expect(() => finishedBalance(["2"], ["3"])).toThrow();
});
it.each([1.5, -1, 2147483648, NaN, Infinity])(
  "rejects invalid piece count %s",
  (value) => {
    expect(() => units(value)).toThrow();
  },
);
it("accepts explicit zero only for counters", () => {
  expect(units(0)).toBe(0);
  expect(() => units(0, true)).toThrow();
});
