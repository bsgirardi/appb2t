import { expect, it } from "vitest";
import { entryState } from "@/domain/finance/balances";
it("derives remaining amount, partial state and overdue independently", () => {
  expect(
    entryState("100.00", "30.00", false, "2026-01-01", "2026-01-02"),
  ).toEqual({
    paidAmount: "30.00",
    remainingAmount: "70.00",
    state: "PARCIAL",
    overdue: true,
  });
  expect(
    entryState("100.00", "100.00", false, "2026-01-01", "2026-01-02"),
  ).toMatchObject({
    state: "LIQUIDADO",
    remainingAmount: "0.00",
    overdue: false,
  });
  expect(
    entryState("100.00", "0.00", true, "2026-01-01", "2026-01-02"),
  ).toMatchObject({
    state: "CANCELADO",
    remainingAmount: "0.00",
    overdue: false,
  });
});
