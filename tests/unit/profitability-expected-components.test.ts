import { expect, it } from "vitest";
import { readExpectedComponents } from "@/domain/profitability/expected-components";

const components = {
  material: "50",
  energy: "5",
  maintenance: "5",
  labor: "20",
  extras: "10",
  failure: "6",
};
it("reads only productive components from the frozen result", () => {
  expect(
    readExpectedComponents({
      ...components,
      depreciation: "999",
      commercialFixed: "40",
    }),
  ).toEqual(components);
  expect(
    readExpectedComponents({ ...components, material: "0" })?.material,
  ).toBe("0");
});
it.each([
  undefined,
  null,
  [],
  "50",
  {},
  { ...components, labor: undefined },
  ...["NaN", "Infinity", "-1", "", "0x10", {}, []].map((material) => ({
    ...components,
    material,
  })),
])("keeps missing or invalid composition unavailable: %j", (result) => {
  expect(readExpectedComponents(result)).toBeUndefined();
});
