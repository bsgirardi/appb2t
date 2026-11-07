import { expect, it } from "vitest";
import { reviewProductPricing } from "@/domain/pricing/review-product-pricing";
import { lotFixture } from "../fixtures/pricing";
import { pricingCatalog } from "../fixtures/pricing-catalog";
import { resolveCatalogPricing } from "@/domain/pricing/resolve";
import { calculateV2 } from "@/domain/pricing/calculate";
it.each(["MARKUP", "CONTRIBUTION", "INFORMED"] as const)(
  "reviews current references without changing %s or mutating historical input",
  (mode) => {
    const old = {
      ...structuredClone(lotFixture),
      mode,
      informedUnitPrice: "0",
    };
    const saved = JSON.stringify(old);
    const catalog = structuredClone(pricingCatalog);
    catalog.materials[0].version = 2;
    catalog.materials[0].price = "150";
    const reviewed = reviewProductPricing(old, catalog);
    expect(reviewed.request.mode).toBe(mode);
    expect(reviewed.request.informedUnitPrice).toBe("0");
    expect(reviewed.request.materials[0].ref.version).toBe(2);
    expect(JSON.stringify(old)).toBe(saved);
    const expected = {
      ...old,
      materials: old.materials.map((m, i) =>
        i ? m : { ...m, ref: { ...m.ref, version: 2 }, pricePerBase: "150" },
      ),
    };
    expect(
      calculateV2(resolveCatalogPricing(catalog, reviewed.request)),
    ).toEqual(calculateV2(expected));
  },
);
it("requires replacing unavailable references", () => {
  const catalog = { ...pricingCatalog, materials: [] };
  const review = reviewProductPricing(lotFixture, catalog);
  expect(review.request.materials[0].ref.id).toBe("");
  expect(() => resolveCatalogPricing(catalog, review.request)).toThrow();
});
