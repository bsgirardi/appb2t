import { expect, it } from "vitest";
import { buildV2Draft } from "@/domain/pricing/conversion";
import { calculation as fixture } from "../fixtures/product";
it("conversionRequiresReview instead of inventing hourly rates", () => {
  const result = buildV2Draft(fixture);
  expect(result.quantity).toBe(1);
  expect(result.legacy).toEqual(fixture);
  expect(result.pending).toEqual(
    expect.arrayContaining([
      "maintenance",
      "finishing",
      "fixation",
      "settingsV2",
    ]),
  );
  expect(result.legacy).not.toBe(fixture);
});
