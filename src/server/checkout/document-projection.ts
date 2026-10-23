import Decimal from "decimal.js";
import type { CheckoutReviewContent } from "@/domain/checkout/types";
import type {
  DocumentInput,
  DocumentTotals,
  InstallmentInput,
} from "@/domain/commerce/types";
export function projectCheckoutDocument(
  original: CheckoutReviewContent,
  document: DocumentInput,
  totals: DocumentTotals,
  installments: InstallmentInput[],
  validUntil?: string,
): CheckoutReviewContent {
  const lines = document.items.map((item, index) => {
    const origin = item.catalogOrigin?.snapshot;
    const source =
      origin ??
      original.lines.find(
        (l) =>
          l.lineId === item.lineId &&
          (!item.productId || l.productId === item.productId),
      );
    return {
      schemaVersion: 1 as const,
      lineId: item.lineId ?? `document-${index}`,
      productId: item.productId ?? source?.productId ?? "standalone",
      commercialRevision: source?.commercialRevision ?? 1,
      name: item.description,
      sku: source?.sku ?? "",
      color: source?.color ?? "",
      size: source?.size ?? "",
      answers: source?.answers ?? [],
      answerLabels: source?.answerLabels ?? [],
      quantity: item.quantity,
      priceKind: "REFERENCE" as const,
      unitPrice: item.unitPrice,
      subtotal: new Decimal(item.unitPrice).times(item.quantity).toFixed(2),
      included: source?.included ?? "",
      leadTimeCondition:
        source?.leadTimeCondition ?? "Prazo a confirmar com a equipe.",
      productionLeadDays: source?.productionLeadDays ?? null,
      paymentTerms: document.paymentTerms,
      ...(source?.kitInstanceId ? { kitInstanceId: source.kitInstanceId } : {}),
    };
  });
  const groups =
    document.catalogKits?.groups.map((g) => {
      const p = document.catalogKits!.preparation.groups.find(
        (p) => p.instanceId === g.instanceId,
      );
      return p
        ? {
            ...g,
            price: {
              ...g.price,
              quantity: p.quantity,
              subtotal: p.subtotal,
              discount: p.discount,
              total: p.total,
              tier: p.tier,
            },
          }
        : g;
    }) ?? [];
  return {
    ...original,
    route: "DIRECT",
    lines,
    groups,
    shipping: document.shipping,
    discount: document.discount,
    total: totals.total,
    paymentTerms: document.paymentTerms,
    installments,
    reasons: [],
    ...(validUntil ? { validUntil } : {}),
  };
}
