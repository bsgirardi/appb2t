import type { CatalogLineSnapshot } from "@/domain/catalog-requests/types";
import type { DocumentItemInput } from "@/domain/commerce/types";
export function receivedArtDescription(line: CatalogLineSnapshot): string {
  return [
    line.name,
    line.color && `Cor: ${line.color}`,
    line.size && `Tamanho: ${line.size}`,
    ...line.answerLabels.map((a) => `${a.label}: ${a.valueLabel}`),
  ]
    .filter(Boolean)
    .join(" · ");
}
export function receivedArtItem(
  requestId: string,
  line: CatalogLineSnapshot,
): DocumentItemInput {
  return {
    productId: line.productId,
    description: receivedArtDescription(line),
    quantity: line.quantity,
    unitPrice: line.unitPrice ?? "0",
    catalogOrigin: {
      schemaVersion: 1,
      requestId,
      sourceLineId: line.lineId,
      snapshot: line,
    },
  };
}
