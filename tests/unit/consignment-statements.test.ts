import { expect, it } from "vitest";
import {
  statementState,
  competenceRange,
} from "@/domain/consignment/statements";
it("derives statement status from real obligations, partial settlements and reversals", () => {
  expect(statementState([{ amount: "80.00", settled: "0.00" }], false)).toBe(
    "FECHADO_PENDENTE",
  );
  expect(
    statementState(
      [
        { amount: "100.00", settled: "100.00" },
        { amount: "20.00", settled: "0.00" },
      ],
      false,
    ),
  ).toBe("PARCIAL");
  expect(statementState([{ amount: "80.00", settled: "80.00" }], false)).toBe(
    "QUITADO",
  );
  expect(statementState([], false)).toBe("QUITADO");
  expect(statementState([], true)).toBe("CANCELADO");
});
it("uses half-open civil month boundaries including December", () => {
  expect(competenceRange("2026-12")).toEqual({
    from: "2026-12-01",
    until: "2027-01-01",
  });
  expect(() => competenceRange("2026-13")).toThrow();
  expect(() => competenceRange("2026-1")).toThrow();
});
