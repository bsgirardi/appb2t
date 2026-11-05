import { expect, it } from "vitest";
import {
  goalValuesSchema,
  monthPeriod,
  monthlyPerformance,
} from "@/domain/profitability/monthly-goals";
import { aggregateSales } from "@/domain/profitability/aggregate";
import { calculateSale } from "@/domain/profitability/calculate";
import { completeInput, profitabilityInput } from "../fixtures/profitability";
it("validates months, leap years and future periods", () => {
  expect(monthPeriod("2028-02", "2028-02-10")).toMatchObject({
    from: "2028-02-01",
    to: "2028-02-10",
    end: "2028-02-29",
    days: 29,
    elapsed: 10,
    state: "current",
  });
  expect(monthPeriod("2026-12", "2026-11-05").state).toBe("future");
  expect(monthPeriod("2026-10", "2026-11-05").state).toBe("closed");
  for (const m of ["2026-13", "2026-00", "26-01", "1899-12"])
    expect(() => monthPeriod(m, "2026-11-05")).toThrow();
});
it("preserves undefined versus zero and rejects invalid or imprecise values", () => {
  expect(
    goalValuesSchema.parse({ revenue: null, contribution: "0", orders: "20" }),
  ).toEqual({ revenue: null, contribution: "0.00", orders: "20" });
  for (const value of ["-1", "NaN", "1e3", "1.001", "1000000000000", 10, ""])
    expect(
      goalValuesSchema.safeParse({
        revenue: value,
        contribution: null,
        orders: null,
      }).success,
    ).toBe(false);
  expect(
    goalValuesSchema.safeParse({
      revenue: "1",
      contribution: "1",
      orders: "1.5",
    }).success,
  ).toBe(false);
});
it("reuses covered summary with decimal progress and explicit estimate", () => {
  const summary = aggregateSales([calculateSale(completeInput())]).summary;
  const result = monthlyPerformance(
    summary,
    { revenue: "100", contribution: "0", orders: null },
    monthPeriod("2026-11", "2026-11-05"),
  );
  expect(result.revenue).toMatchObject({
    actual: "200",
    progress: "200.00",
    projection: "1200.00",
  });
  expect(result.contribution.progress).toBeNull();
  expect(result.orders).toMatchObject({ actual: "1", progress: null });
});
it("never turns uncovered contribution into zero or a subtotal into progress", () => {
  const incomplete = aggregateSales([
    calculateSale(profitabilityInput()),
  ]).summary;
  const goals = { revenue: "1", contribution: "1", orders: "1" };
  expect(
    monthlyPerformance(incomplete, goals, monthPeriod("2026-10", "2026-11-05"))
      .contribution.actual,
  ).toBeNull();
  const empty = monthlyPerformance(
    aggregateSales([]).summary,
    goals,
    monthPeriod("2026-11", "2026-11-05"),
  );
  expect(empty.revenue.actual).toBe("0");
  expect(empty.orders.actual).toBe("0");
  expect(empty.contribution.actual).toBeNull();
  expect(
    monthlyPerformance(incomplete, goals, monthPeriod("2026-12", "2026-11-05"))
      .orders.actual,
  ).toBeNull();
});
