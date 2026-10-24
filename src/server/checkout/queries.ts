import type { Checkout, Prisma } from "@prisma/client";
import type {
  CheckoutPrincipal,
  CheckoutReviewContent,
  CheckoutReceipt,
  CheckoutPublicDetail,
} from "@/domain/checkout/types";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { authorizedSession } from "./commands";
export function reviewOf(row: Checkout) {
  return {
    ...(row.review as unknown as CheckoutReviewContent),
    id: row.id,
    version: row.version,
    fingerprint: row.fingerprint,
  };
}
export async function receiptOf(
  tx: Prisma.TransactionClient,
  row: Checkout,
): Promise<CheckoutReceipt | null> {
  if (!row.acceptedAt) return null;
  const sale = row.saleId
    ? await tx.sale.findUnique({
        where: { id: row.saleId },
        select: { sequence: true },
      })
    : null;
  return {
    checkoutId: row.id,
    protocol: `PED-${String(row.sequence).padStart(6, "0")}`,
    acceptedAt: row.acceptedAt.toISOString(),
    state: row.state,
    saleNumber: sale ? `VEN-${String(sale.sequence).padStart(6, "0")}` : null,
  };
}
export async function detailWithClient(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<CheckoutPublicDetail> {
  const row = await tx.checkout.findUniqueOrThrow({ where: { id } });
  const cancel = await tx.checkoutCancellation.findFirst({
    where: { checkoutId: id },
    orderBy: { createdAt: "desc" },
  });
  return {
    review: reviewOf(row),
    receipt: await receiptOf(tx, row),
    cancellation: cancel
      ? {
          state: cancel.state,
          reason: cancel.reason,
          response: cancel.response,
        }
      : null,
  };
}
export async function getCheckoutDetail(
  p: CheckoutPrincipal,
): Promise<CheckoutPublicDetail> {
  return db.$transaction(async (tx) => {
    const s = await authorizedSession(tx, p);
    if (!s.checkoutId)
      throw new AppError("NOT_FOUND", "Nenhum pedido nesta sessão.");
    return detailWithClient(tx, s.checkoutId);
  });
}
