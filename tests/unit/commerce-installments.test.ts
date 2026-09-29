import { expect, it } from "vitest";
import {
  splitInstallments,
  validateInstallments,
} from "@/domain/commerce/installments";
it("distributes cents and anchors monthly dates to original day", () => {
  const rows = splitInstallments("100.00", 3, "2028-01-31");
  expect(rows.map((r) => r.amount)).toEqual(["33.34", "33.33", "33.33"]);
  expect(rows.map((r) => r.dueDate)).toEqual([
    "2028-01-31",
    "2028-02-29",
    "2028-03-31",
  ]);
  expect(validateInstallments("100", rows)).toEqual(rows);
  expect(() => splitInstallments("0.02", 3, "2028-01-31")).toThrow();
  expect(() => validateInstallments("99", rows)).toThrow();
  expect(() => validateInstallments("66.68", [rows[0], rows[0]])).toThrow();
});
