import type { Prisma } from "@prisma/client";
export async function invalidateCheckoutQuote(
  tx: Prisma.TransactionClient,
  quoteId: string,
) {
  const c = await tx.checkout.findUnique({ where: { quoteId } });
  if (!c || c.saleId || c.state === "CLOSED") return;
  await tx.checkoutOffer.updateMany({
    where: { checkoutId: c.id, active: true },
    data: { active: false },
  });
  await tx.checkout.update({
    where: { id: c.id },
    data: { state: "REVIEW", version: { increment: 1 } },
  });
}
