import { expect, it } from "vitest";
import { reviewComparisonOffer } from "@/domain/pricing/comparisons/reuse";
import { lotFixture as input } from "../fixtures/pricing";
import { pricingCatalog as catalog } from "../fixtures/pricing-catalog";
it("requires replacement of missing references and keeps discounted price informed", () => {
  const result = reviewComparisonOffer({ ...input, mode: "INFORMED", informedUnitPrice: "11.24" }, { ...catalog, materials: [], channels: [] });
  expect(result.request.mode).toBe("INFORMED");
  expect(result.request.informedUnitPrice).toBe("11.24");
  expect(result.request.materials[0].ref.id).toBe("");
  expect(result.request.channelRef.id).toBe("");
  expect(result.changes.join(" ")).toContain("indisponível");
  expect(input.mode).toBe("MARKUP");
});
