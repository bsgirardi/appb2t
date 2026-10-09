import { expect, it } from "vitest";
import { resolveCoverage } from "@/domain/profitability/coverage";
it("distinguishes unknown, partial, provisional and complete", () => {
  expect(
    resolveCoverage({
      hasKnown: false,
      missing: ["material"],
      provisional: false,
    }),
  ).toBe("UNAVAILABLE");
  expect(
    resolveCoverage({
      hasKnown: true,
      missing: ["material"],
      provisional: true,
    }),
  ).toBe("PARTIAL");
  expect(
    resolveCoverage({ hasKnown: true, missing: [], provisional: true }),
  ).toBe("PROVISIONAL");
  expect(
    resolveCoverage({ hasKnown: true, missing: [], provisional: false }),
  ).toBe("COMPLETE");
});
