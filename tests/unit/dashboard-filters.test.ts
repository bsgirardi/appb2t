import { expect, it } from "vitest";
import { resolveDashboardFilter } from "@/domain/dashboard/filters";

const now = new Date("2026-11-01T01:00:00Z");
it("defaults to the current Sao Paulo month and equal previous window", () => {
  const f = resolveDashboardFilter({}, "OPERATOR", now);
  expect(f).toMatchObject({
    panel: "overview",
    from: "2026-10-01",
    to: "2026-10-31",
    previousFrom: "2026-08-31",
    previousTo: "2026-09-30",
  });
});
it("rejects protected panels before querying", () => {
  for (const panel of ["finance", "profitability"])
    expect(() => resolveDashboardFilter({ panel }, "OPERATOR", now)).toThrow(
      /administrador/i,
    );
});
it("rejects impossible, inverted, repeated and excessive dates", () => {
  for (const raw of [
    { from: "2026-02-30" },
    { from: "2026-10-22", to: "2026-10-01" },
    { panel: ["overview", "finance"] },
    { from: "1900-01-01" },
  ])
    expect(() => resolveDashboardFilter(raw, "ADMIN", now)).toThrow();
});
it("supports 30 and 90 days and a margin reference without persistence", () => {
  expect(resolveDashboardFilter({ range: "30" }, "ADMIN", now).from).toBe(
    "2026-10-02",
  );
  expect(resolveDashboardFilter({ range: "90" }, "ADMIN", now).from).toBe(
    "2026-08-03",
  );
  expect(resolveDashboardFilter({ margin: "15" }, "ADMIN", now).margin).toBe(
    "15",
  );
});
