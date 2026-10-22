import Decimal from "decimal.js";
import { AppError } from "@/lib/errors";
import type { QuoteDraftInput } from "@/domain/commerce/types";
import { catalogLineOriginSchema } from "@/domain/catalog-requests/snapshot";
import {
  catalogKitDocumentSchema,
  discountReviewFingerprint,
  assertKitDocumentBytes,
  type KitDiscountReview,
} from "@/domain/kits/document";
export function enforceKitDocumentEdit(
  previous: QuoteDraftInput,
  next: QuoteDraftInput,
  review?: KitDiscountReview,
): boolean {
  if (!previous.catalogKits) {
    if (next.catalogKits)
      throw new AppError(
        "VALIDATION",
        "O histórico de kits só pode ser criado pelo atendimento da solicitação.",
      );
    return false;
  }
  const history = catalogKitDocumentSchema.parse(previous.catalogKits);
  if (
    next.catalogKits &&
    JSON.stringify(catalogKitDocumentSchema.parse(next.catalogKits)) !==
      JSON.stringify(history)
  )
    throw new AppError(
      "VALIDATION",
      "O histórico recebido e o cálculo da preparação não podem ser substituídos.",
    );
  next.catalogKits = history;
  if (
    !next.items?.length ||
    next.discount === undefined ||
    next.items.some((i) => !i.lineId) ||
    new Set(next.items.map((i) => i.lineId)).size !== next.items.length
  )
    throw new AppError(
      "VALIDATION",
      "Revise as linhas identificadas e o desconto atual do documento.",
    );
  const originals = new Map(
    (previous.items ?? []).map((i) => [i.lineId, i.catalogOrigin]),
  );
  for (const item of next.items) {
    const original = originals.get(item.lineId);
    if (original) {
      if (
        item.catalogOrigin &&
        JSON.stringify(catalogLineOriginSchema.parse(item.catalogOrigin)) !==
          JSON.stringify(catalogLineOriginSchema.parse(original))
      )
        throw new AppError(
          "VALIDATION",
          "A origem recebida não pode ser substituída.",
        );
      item.catalogOrigin = catalogLineOriginSchema.parse(original);
    } else if (item.catalogOrigin?.snapshot.kitInstanceId)
      throw new AppError(
        "VALIDATION",
        "Uma nova linha não pode herdar a origem de um componente recebido.",
      );
  }
  const fingerprint = discountReviewFingerprint(next.items, next.discount),
    changed =
      discountReviewFingerprint(
        previous.items ?? [],
        previous.discount ?? "0.00",
      ) !== fingerprint;
  if ((changed && !review) || (review && review.fingerprint !== fingerprint))
    throw new AppError(
      "VALIDATION",
      "Confirme a revisão do desconto para os preços, as quantidades e as linhas atuais.",
    );
  const subtotal = next.items.reduce(
    (s, i) => s.plus(new Decimal(i.unitPrice).times(i.quantity)),
    new Decimal(0),
  );
  if (new Decimal(next.discount).gte(subtotal))
    throw new AppError(
      "VALIDATION",
      "O desconto global deve ser menor que o subtotal.",
    );
  try {
    assertKitDocumentBytes(next);
  } catch (error) {
    throw new AppError("VALIDATION", (error as Error).message);
  }
  return !!review;
}
