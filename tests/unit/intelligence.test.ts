import { expect, it } from "vitest";
import { calculateSale } from "@/domain/profitability/calculate";
import { aggregateSales } from "@/domain/profitability/aggregate";
import {
  buildRankings,
  simulatePerformance,
} from "@/domain/profitability/intelligence";
import { completeInput, profitabilityInput } from "../fixtures/profitability";

it("ranks only fully covered groups and retains unknown groups and sources", () => {
  const complete = calculateSale(completeInput());
  const unknown = calculateSale({
    ...profitabilityInput(),
    saleId: "unknown",
    lines: profitabilityInput().lines.map((l) => ({
      ...l,
      productId: "unknown",
    })),
  });
  const canceled = calculateSale({
    ...completeInput(),
    saleId: "canceled",
    status: "CANCELADA",
  });
  const result = buildRankings([complete, unknown, canceled], {
    sale: { id: "c", name: "Cliente" },
    unknown: { id: "u", name: "Outro" },
  });
  expect(result.products[0]).toMatchObject({
    rank: 1,
    summary: { actual: { value: "90" } },
    sources: [{ id: "sale", number: "1" }],
  });
  expect(result.products[1].rank).toBeNull();
  expect(result.customers).toHaveLength(2);
  expect(result.channels[0].rank).toBeNull();
});

it("keeps zero and negative contribution, uses deterministic descending order", () => {
  const rows = ["300", "170", "200"].map((cost, i) => {
    const input = completeInput();
    input.saleId = String(i);
    input.lines[0].productId = String(i);
    input.lines[0].actual.components!.material = cost;
    input.lines[0].actual.total = String(Number(cost) + 5);
    return calculateSale(input);
  });
  const ranked = buildRankings(rows, {}).products;
  expect(ranked.map((g) => g.id)).toEqual(["1", "2", "0"]);
  expect(ranked[0].summary.actual.value).toBe("0");
  expect(ranked.every((g) => g.rank !== null)).toBe(true);
});

it("projects an inclusive civil period and measures a goal without mutating history", () => {
  const summary = aggregateSales([calculateSale(completeInput())]).summary;
  const result = simulatePerformance(summary, {
    from: "2026-10-01",
    to: "2026-10-10",
    today: "2026-11-04",
    horizon: "30",
    goal: "400",
    metric: "revenue",
    enabled: true,
  });
  expect(result).toMatchObject({
    days: 10,
    actual: "200",
    projection: "600.00",
    progress: "50.00",
  });
  expect(summary.revenue).toBe("200");
});

it("preserves unavailable data, refuses invalid, future or undated history", () => {
  const summary = aggregateSales([calculateSale(profitabilityInput())]).summary;
  const base = {
    from: "2026-10-01",
    to: "2026-10-10",
    today: "2026-11-04",
    horizon: "30",
    goal: "100",
    metric: "contribution" as const,
    enabled: true,
  };
  expect(simulatePerformance(summary, base).actual).toBeNull();
  expect(simulatePerformance(summary, base).projection).toBeNull();
  for (const change of [
    { from: "2026-02-30" },
    { enabled: false },
    { goal: "0" },
    { goal: "NaN" },
  ]) {
    expect(
      simulatePerformance(summary, { ...base, ...change }).error,
    ).toBeTruthy();
  }
  expect(
    simulatePerformance(aggregateSales([]).summary, {
      ...base,
      metric: "revenue",
    }).actual,
  ).toBeNull();
});

it("keeps goal progress when future period or an invalid horizon blocks only extrapolation", () => {
  const summary = aggregateSales([calculateSale(completeInput())]).summary;
  const base = {
    from: "2026-11-01",
    to: "2026-11-30",
    today: "2026-11-04",
    horizon: "30",
    goal: "400",
    metric: "revenue" as const,
    enabled: true,
  };
  expect(simulatePerformance(summary, base)).toMatchObject({
    actual: "200",
    progress: "50.00",
    projection: null,
    error: null,
  });
  expect(simulatePerformance(summary, base).projectionError).toBeTruthy();
  for (const horizon of ["", "Infinity", "1.5", "0", "367"]) {
    const result = simulatePerformance(summary, {
      ...base,
      to: "2026-11-03",
      horizon,
    });
    expect(result).toMatchObject({
      progress: "50.00",
      projection: null,
      error: null,
    });
    expect(result.projectionError).toBeTruthy();
  }
});

it("handles leap days, partial current day and negative goal progress", () => {
  const summary = aggregateSales([calculateSale(completeInput())]).summary;
  summary.actual.value = "-25";
  const base = {
    from: "2024-02-28",
    to: "2024-03-01",
    today: "2024-03-01",
    horizon: "3",
    goal: "100",
    metric: "contribution" as const,
    enabled: true,
  };
  expect(simulatePerformance(summary, base)).toMatchObject({
    days: 3,
    projection: "-25.00",
    progress: "-25.00",
    partialDay: true,
  });
});
