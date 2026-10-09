import { expect, it } from "vitest";
import { allocate } from "@/domain/profitability/allocation";
it("conserves a cent with deterministic largest remainders", () => {
  const result = allocate(
    "0.01",
    [
      { key: "c", position: 2, weight: "1" },
      { key: "a", position: 0, weight: "1" },
      { key: "b", position: 1, weight: "1" },
    ],
    2,
  );
  expect(result).toEqual([
    { key: "c", value: "0.00" },
    { key: "a", value: "0.01" },
    { key: "b", value: "0.00" },
  ]);
});
it("conserves six decimal costs without negative residuals", () => {
  expect(
    allocate(
      "0.000002",
      [
        { key: "a", position: 0, weight: "1" },
        { key: "b", position: 1, weight: "1" },
        { key: "c", position: 2, weight: "1" },
      ],
      6,
    ).map((x) => x.value),
  ).toEqual(["0.000001", "0.000001", "0.000000"]);
});
it("rejects negative weights and invalid zero denominators", () => {
  expect(() =>
    allocate("1", [{ key: "a", position: 0, weight: "-1" }], 2),
  ).toThrow();
  expect(() =>
    allocate("1", [{ key: "a", position: 0, weight: "0" }], 2),
  ).toThrow();
});
