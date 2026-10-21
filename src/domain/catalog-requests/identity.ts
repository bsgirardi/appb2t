import type { CatalogSubmission } from "./types";
export function canonicalSubmission(input: CatalogSubmission): string {
  const c = input.contact;
  const legacy = JSON.stringify([
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
  if (input.schemaVersion !== 2) return legacy;
  return JSON.stringify([
    legacy,
    2,
    input.items.map((i) => i.kitInstanceId ?? null),
    (input.groups ?? []).map((g) => [
      g.instanceId,
      g.kitId,
      g.commercialRevision,
      g.placements.map((p) => [p.lineId, p.x, p.y, p.z]),
      g.seenPrice,
    ]),
  ]);
}
