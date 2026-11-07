import type { PricingCatalogDTO, PricingV2Input } from "./types";
import { reviewComparisonOffer } from "./comparisons/reuse";

/** Review references without converting the product's commercial pricing mode. */
export function reviewProductPricing(
  input: PricingV2Input,
  catalog: PricingCatalogDTO,
) {
  const review = reviewComparisonOffer(input, catalog);
  review.request.mode = input.mode;
  review.request.informedUnitPrice = input.informedUnitPrice;
  return review;
}
