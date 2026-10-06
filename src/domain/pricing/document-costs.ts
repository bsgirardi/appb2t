import type { DocumentItemInput } from "@/domain/commerce/types";
import type { PricingSnapshotDTO, LineCostBinding } from "./types";
import { calculateV2 } from "./calculate";
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
  return { ...item, lineId: crypto.randomUUID() };
}
export function compareLineCost(
  item: DocumentItemInput,
  snapshot: PricingSnapshotDTO,
  state: LineCostBinding["state"],
) {
  if (state === "STALE" || item.quantity !== snapshot.input.quantity)
    return null;
  return calculateV2({
    ...snapshot.input,
    mode: "INFORMED",
    informedUnitPrice: item.unitPrice,
  });
}
