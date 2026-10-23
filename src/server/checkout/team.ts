import type { Actor } from "@/server/auth/session";
import type {
  CheckoutDraft,
  CheckoutReviewContent,
} from "@/domain/checkout/types";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import { getPublicAppearance } from "@/server/appearance";
import { lockPlanning } from "@/server/planning/coordination";
import { assertCheckoutActor } from "./access";
import { detailWithClient } from "./queries";
import { checkoutEvent, lockCheckout, json } from "./commands";
import { checkoutFingerprint } from "./review";
export async function getCheckoutForTeam(actor: Actor, id: string) {
  return db.$transaction(async (tx) => {
    await assertCheckoutActor(tx, actor);
    const row = await tx.checkout.findUniqueOrThrow({ where: { id } });
    const detail = await detailWithClient(tx, id);
    const request = row.requestId
      ? await tx.catalogRequest.findUnique({ where: { id: row.requestId } })
      : null;
    const quoteId = row.quoteId ?? request?.quoteId;
    const quote = quoteId
      ? await tx.quote.findUnique({
          where: { id: quoteId },
          select: {
            id: true,
            version: true,
            status: true,
            totals: true,
            validUntil: true,
          },
        })
      : null;
    const contact = (row.review as unknown as CheckoutReviewContent).contact;
    const possibleDuplicates = await tx.customer.count({
      where: {
        OR: [
          ...(contact.email ? [{ email: contact.email }] : []),
          ...(contact.phone ? [{ phone: contact.phone }] : []),
        ],
      },
    });
    const events = await tx.checkoutEvent.findMany({
      where: { checkoutId: id },
      orderBy: { createdAt: "asc" },
      select: { action: true, actorName: true, reason: true, createdAt: true },
    });
    return {
      ...detail,
      id,
      version: row.version,
      state: row.state,
      requestId: row.requestId,
      quote: quote
        ? {
            ...quote,
            validUntil: quote.validUntil?.toISOString().slice(0, 10) ?? null,
          }
        : null,
      saleId: row.saleId,
      possibleDuplicates,
      events: events.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  });
}
export async function updateCheckoutDelivery(
  actor: Actor,
  id: string,
  version: number,
  delivery: CheckoutDraft["delivery"],
) {
  return db.$transaction(async (tx) => {
    await assertCheckoutActor(tx, actor);
    await lockPlanning(tx);
    const c = await lockCheckout(tx, id);
    if (c.version !== version || c.saleId || c.state === "CLOSED")
      throw conflict();
    const original = c.review as unknown as CheckoutReviewContent;
    if (
      delivery.mode === "AUTOMATIC" ||
      !original.deliveryModes.includes(delivery.mode)
    )
      throw new AppError("VALIDATION", "Modalidade não permitida pelos itens.");
    const pickupAddress =
      delivery.mode === "PICKUP" ? (await getPublicAppearance(tx)).address : "";
    if (delivery.mode === "PICKUP" && !pickupAddress.trim())
      throw new AppError("VALIDATION", "Cadastre o endereço da loja.");
    const review = {
      ...original,
      delivery,
      pickupAddress,
      total: null,
      shipping: delivery.mode === "PICKUP" ? "0.00" : null,
    };
    await tx.checkoutOffer.updateMany({
      where: { checkoutId: id, active: true },
      data: { active: false },
    });
    await tx.checkout.update({
      where: { id },
      data: {
        review: json(review),
        fingerprint: checkoutFingerprint(review),
        state: "REVIEW",
        version: { increment: 1 },
      },
    });
    await checkoutEvent(
      tx,
      id,
      "REVIEW_DELIVERY",
      actor.name,
      "Entrega revisada pela equipe; republicar o orçamento antes do aceite.",
      actor.id,
    );
  });
}
export type CheckoutTeamDTO = Awaited<ReturnType<typeof getCheckoutForTeam>>;
