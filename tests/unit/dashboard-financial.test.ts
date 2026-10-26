import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), user: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { $transaction: mocks.transaction, user: { findUnique: mocks.user } },
}));
import {
  summarizeFinance,
  hourlyResult,
  measuredMachineMinutes,
} from "@/domain/dashboard/financial";
import { getFinancialDashboard } from "@/server/dashboard/finance";
import { getProfitabilityDashboard } from "@/server/dashboard/profitability";
import { resolveDashboardFilter } from "@/domain/dashboard/filters";
const f = resolveDashboardFilter({}, "ADMIN", new Date("2026-10-26T15:00Z"));
it("guards financial and cost queries before any database access", async () => {
  const actor = {
    id: "u",
    name: "U",
    email: "u@example.com",
    role: "OPERATOR" as const,
  };
  await expect(getFinancialDashboard(actor, f)).rejects.toThrow();
  await expect(getProfitabilityDashboard(actor, f)).rejects.toThrow();
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.user).not.toHaveBeenCalled();
});
it("uses outstanding net of valid settlements, overdue and horizon days", () => {
  const result = summarizeFinance(
    [
      { id: "a", kind: "RECEIVABLE", due: "2026-10-25", remaining: "10" },
      { id: "b", kind: "PAYABLE", due: "2026-10-30", remaining: "20" },
      { id: "c", kind: "RECEIVABLE", due: "2026-11-15", remaining: "30" },
    ],
    "100",
    f.today,
  );
  expect(result).toMatchObject({
    receivable: "40.00",
    overdueReceivable: "10.00",
    payable7: "20.00",
    receivable7: "0.00",
    receivable30: "30.00",
    delinquency: "25.00",
    minimum: "90.00",
  });
  expect(summarizeFinance([], null, f.today)).toMatchObject({
    minimum: null,
    delinquency: null,
  });
});
it("does not invent hourly results from partial costs or missing time", () => {
  expect(hourlyResult("100", "120", "COMPLETE")).toBe("50.00");
  expect(hourlyResult("100", "120", "PARTIAL")).toBeNull();
  expect(hourlyResult("100", null, "COMPLETE")).toBeNull();
  expect(hourlyResult("100", "0", "COMPLETE")).toBeNull();
});
it("counts complete manual work as zero machine time without invalidating measured printing", () => {
  expect(
    measuredMachineMinutes({
      timeComplete: true,
      machineMinutes: null,
      premises: { manualStage: true },
      corrections: [],
    }),
  ).toBe("0");
  expect(
    measuredMachineMinutes({
      timeComplete: true,
      machineMinutes: "120",
      premises: { manualStage: false },
      corrections: [{ machineMinutes: "-10" }],
    }),
  ).toBe("110");
  expect(
    measuredMachineMinutes({
      timeComplete: true,
      machineMinutes: null,
      premises: null,
      corrections: [],
    }),
  ).toBeNull();
});
