import { expect, it } from "vitest";
import { balanceAt } from "@/domain/finance/balances";
it("sums signed movements exactly and leaves pre-opening balance unknown", () => {
  const rows = [
    { amount: "25.50", effectiveDate: "2026-09-02" },
    { amount: "-10.00", effectiveDate: "2026-09-03" },
  ];
  expect(balanceAt("100.00", "2026-09-01", rows, "2026-09-30")).toBe("115.50");
  expect(balanceAt("100.00", "2026-09-01", rows, "2026-08-31")).toBeNull();
  expect(balanceAt("100.00", "2026-09-01", rows, "2026-09-02")).toBe("125.50");
});
