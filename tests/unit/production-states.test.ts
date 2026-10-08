import { expect, it } from "vitest";
import { projectSaleStatus } from "@/domain/production/states";
it.each([
  [3, 7, true, "PRONTA"],
  [3, 2, true, "EM_PRODUCAO"],
  [10, 0, true, "ENTREGUE"],
  [0, 0, false, "CONFIRMADA"],
] as const)(
  "projects delivered %s ready %s",
  (delivered, ready, started, want) => {
    expect(projectSaleStatus([{ sold: 10, delivered, ready, started }])).toBe(
      want,
    );
  },
);
it("does not call an empty sale delivered", () => {
  expect(projectSaleStatus([])).toBe("CONFIRMADA");
});
it("keeps a mixed ready and unfinished sale in production", () => {
  expect(
    projectSaleStatus([
      { sold: 2, delivered: 0, ready: 2, started: true },
      { sold: 1, delivered: 0, ready: 0, started: false },
    ]),
  ).toBe("EM_PRODUCAO");
});
