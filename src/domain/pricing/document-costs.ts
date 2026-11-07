import type { DocumentItemInput } from "@/domain/commerce/types";
import type { PricingSnapshotDTO, LineCostBinding } from "./types";
import { calculatePricing } from "./calculate-fiscal";
export function lineFingerprint(item: DocumentItemInput): string {
  return JSON.stringify([
    item.productId ?? null,
    item.description.trim(),
    item.quantity,
  ]);
}
export function duplicateDocumentItem(
  item: DocumentItemInput,
): DocumentItemInput {
  const duplicate = { ...item, lineId: crypto.randomUUID() };
  if (item.catalogOrigin?.snapshot.kitInstanceId)
    delete duplicate.catalogOrigin;
  return duplicate;
}
export function compareLineCost(
  item: DocumentItemInput,
  snapshot: PricingSnapshotDTO,
  state: LineCostBinding["state"],
) {
  if (state === "STALE" || item.quantity !== snapshot.input.quantity)
    return null;
  return calculatePricing({
    ...snapshot.input,
    mode: "INFORMED",
    informedUnitPrice: item.unitPrice,
  });
}
