import { expect, it } from "vitest";
import { projectCashFlow } from "@/domain/finance/projection";
it("projects only remaining amounts, separating overdue net", () => {
  const result = projectCashFlow("130.00", "2026-01-10", [
    { kind: "RECEIVABLE", dueDate: "2026-01-01", remainingAmount: "50.00" },
    { kind: "PAYABLE", dueDate: "2026-01-01", remainingAmount: "20.00" },
    { kind: "RECEIVABLE", dueDate: "2026-01-11", remainingAmount: "10.00" },
    { kind: "RECEIVABLE", dueDate: "2026-01-12", remainingAmount: "0.00" },
  ]);
  expect(result.overdueNet).toBe("30.00");
  expect(result.projected.map((d) => d.closingBalance)).toEqual([
    "160.00",
    "170.00",
  ]);
});
