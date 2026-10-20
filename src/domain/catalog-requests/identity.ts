import type { CatalogSubmission } from "./types";
export function canonicalSubmission(input: CatalogSubmission): string {
  const c = input.contact;
  return JSON.stringify([
    c.name,
    c.preferredChannel,
    c.phone,
    c.email,
    input.items.map((i) => [
      i.lineId ?? "",
      i.productId,
      i.color,
      i.size,
      i.quantity,
      [...i.answers]
        .sort((a, b) => a.fieldId.localeCompare(b.fieldId, "en"))
        .map((a) => [a.fieldId, a.value]),
      i.commercialRevision,
      i.seenPrice
        ? [i.seenPrice.kind, i.seenPrice.unit, i.seenPrice.subtotal]
        : null,
    ]),
  ]);
}
