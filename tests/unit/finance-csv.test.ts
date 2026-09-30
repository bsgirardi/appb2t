import { expect, it } from "vitest";
import { csvText, csvMoney } from "@/domain/finance/csv";
it.each([
  "=1",
  "+1",
  "-1",
  "@SUM",
  "\tvalue",
  "\rvalue",
  "  =1",
  "  \tvalue",
  " \rvalue",
])("neutralizes formula text %j", (value) =>
  expect(csvText(value)).toBe(`"'${value}"`),
);
it("escapes multiline text and formats controlled money", () => {
  expect(csvText('Cliente; "um"\nlinha')).toBe('"Cliente; ""um""\nlinha"');
  expect(csvMoney("-10.00")).toBe("-10,00");
  expect(() => csvMoney("=1+1")).toThrow();
});
