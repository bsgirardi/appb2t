import { assertOpportunityQuoteOpen } from "@/server/opportunities/commerce";
import type { Actor } from "@/server/auth/session";
import type {
  CheckoutPrincipal,
  CheckoutQuotePublicationInput,
  CheckoutReview,
  CheckoutDecisionInput,
  CheckoutReceipt,
} from "@/domain/checkout/types";
import type { CheckoutReviewContent } from "@/domain/checkout/types";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import { projectCheckoutDocument } from "./document-projection";
import {
  checkoutQuotePublicationSchema,
  checkoutDecisionSchema,
} from "@/domain/checkout/validation";
import { lockPlanning } from "@/server/planning/coordination";
import { lockCommerce, lockOperation } from "@/server/commerce/locks";
import { quoteSchema } from "@/domain/commerce/validation";
import { effectiveQuoteStatus } from "@/domain/commerce/states";
import { civilDateFromDb, todaySaoPaulo } from "@/domain/commerce/dates";
import { calculateDocumentTotals } from "@/domain/commerce/totals";
import { validateInstallments } from "@/domain/commerce/installments";
import { convertQuoteWithClient } from "@/server/commerce/sale-write";
import { quoteEvent } from "@/server/commerce/audit";
import { assertCheckoutActor } from "./access";
import {
  checkoutEvent,
  lockCheckout,
  json,
  runCheckoutCommand,
} from "./commands";
import { checkoutFingerprint } from "./review";
import { reviewOf, receiptOf } from "./queries";
export async function publishCheckoutQuote(
  actor: Actor,
  id: string,
  raw: CheckoutQuotePublicationInput,
): Promise<CheckoutReview> {
  const input = checkoutQuotePublicationSchema.parse(raw);
  return db.$transaction(
    async (tx) => {
      await assertCheckoutActor(tx, actor);
      const key = `checkout-publish:${id}:${input.operationKey}`;
      await lockOperation(tx, key);
      await lockPlanning(tx);
      const c = await lockCheckout(tx, id);
      const prior = await tx.checkoutOperation.findUnique({ where: { key } });
      if (prior) {
        if (prior.payloadHash !== checkoutFingerprint(input)) throw conflict();
        return prior.result as unknown as CheckoutReview;
      }
      if (!c.acceptedAt || c.saleId || c.state === "CLOSED") throw conflict();
      const request = c.requestId
        ? await tx.catalogRequest.findUniqueOrThrow({
            where: { id: c.requestId },
          })
        : null;
      const quoteId = c.quoteId ?? request?.quoteId;
      if (!quoteId)
        throw new AppError(
          "VALIDATION",
          "Prepare e emita o orçamento pelo atendimento.",
        );
      await lockCommerce(tx, { quoteId });
      await assertOpportunityQuoteOpen(tx, quoteId);
      const q = await tx.quote.findUniqueOrThrow({ where: { id: quoteId } });
      if (
        q.version !== input.expectedQuoteVersion ||
        !q.validUntil ||
        !["ENVIADO", "APROVADO"].includes(
          effectiveQuoteStatus(
            q.status,
            civilDateFromDb(q.validUntil),
            todaySaoPaulo(new Date()),
          ),
        )
      )
        throw conflict();
      const document = quoteSchema.parse(q.input);
      const totals = calculateDocumentTotals(
        document.items,
        document.discount,
        document.shipping,
      );
      const installments = validateInstallments(
        totals.total,
        input.installments,
      );
      const original = c.review as unknown as CheckoutReviewContent;
      if (original.delivery.mode === "PICKUP" && document.shipping !== "0.00")
        throw new AppError(
          "VALIDATION",
          "Retirada exige frete zero no orçamento.",
        );
      const review = projectCheckoutDocument(
        original,
        document,
        totals,
        installments,
        document.validUntil,
      );
      const fingerprint = checkoutFingerprint(review);
      await tx.checkoutOffer.updateMany({
        where: { checkoutId: id, active: true },
        data: { active: false },
      });
      await tx.checkoutAccess.updateMany({
        where: { checkoutId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.checkoutOffer.create({
        data: {
          checkoutId: id,
          quoteVersion: q.version,
          review: json(review),
          fingerprint,
        },
      });
      const updated = await tx.checkout.update({
        where: { id },
        data: {
          quoteId,
          state: "OFFERED",
          review: json(review),
          fingerprint,
          version: { increment: 1 },
        },
      });
      await checkoutEvent(tx, id, "PUBLISH_OFFER", actor.name, "", actor.id);
      const result = reviewOf(updated);
      await tx.checkoutOperation.create({
        data: {
          key,
          checkoutId: id,
          type: "PUBLISH",
          payloadHash: checkoutFingerprint(input),
          result: json(result),
        },
      });
      return result;
    },
    { timeout: 20000 },
  );
}
export async function acceptCheckoutQuote(
  p: CheckoutPrincipal,
  raw: CheckoutDecisionInput,
): Promise<CheckoutReceipt> {
  const input = checkoutDecisionSchema.parse(raw);
  return runCheckoutCommand(
    p,
    "ACCEPT_QUOTE",
    input.operationKey,
    input,
    async (tx, id) => {
      const c = await tx.checkout.findUniqueOrThrow({ where: { id } });
      if (
        c.saleId &&
        c.state === "CONFIRMED" &&
        c.fingerprint === input.fingerprint
      )
        return (await receiptOf(tx, c))!;
      if (
        c.version !== input.expectedVersion ||
        c.fingerprint !== input.fingerprint ||
        c.state !== "OFFERED" ||
        !c.quoteId
      )
        throw conflict();
      const offer = await tx.checkoutOffer.findFirst({
        where: { checkoutId: id, active: true },
      });
      if (!offer || offer.fingerprint !== input.fingerprint) throw conflict();
      await lockCommerce(tx, { quoteId: c.quoteId });
      let q = await tx.quote.findUniqueOrThrow({ where: { id: c.quoteId } });
      if (
        q.version !== offer.quoteVersion ||
        !q.validUntil ||
        !["ENVIADO", "APROVADO"].includes(
          effectiveQuoteStatus(
            q.status,
            civilDateFromDb(q.validUntil),
            todaySaoPaulo(new Date()),
          ),
        )
      )
        throw conflict();
      const author = {
        kind: "CHECKOUT" as const,
        checkoutId: id,
        name: input.name,
      };
      if (q.status === "ENVIADO") {
        q = await tx.quote.update({
          where: { id: q.id },
          data: { status: "APROVADO", version: { increment: 1 } },
        });
        await quoteEvent(tx, author, q.id, "APPROVE");
      }
      const review = c.review as unknown as CheckoutReviewContent;
      const sale = await convertQuoteWithClient(tx, author, {
        quoteId: q.id,
        expectedVersion: q.version,
        rows: review.installments,
      });
      await tx.checkoutOffer.update({
        where: { id: offer.id },
        data: { active: false },
      });
      const updated = await tx.checkout.update({
        where: { id },
        data: {
          saleId: sale.id,
          state: "CONFIRMED",
          version: { increment: 1 },
        },
      });
      await checkoutEvent(tx, id, "ACCEPT_OFFER", input.name);
      return (await receiptOf(tx, updated))!;
    },
  );
}
export async function withdrawCheckoutOffer(
  actor: Actor,
  id: string,
  version: number,
  reason: string,
): Promise<void> {
  if (reason.trim().length < 3 || reason.length > 2000)
    throw new AppError("VALIDATION", "Informe o motivo.");
  await db.$transaction(async (tx) => {
    await assertCheckoutActor(tx, actor);
    await lockPlanning(tx);
    const c = await lockCheckout(tx, id);
    if (c.version !== version || c.saleId || c.state === "CLOSED")
      throw conflict();
    await tx.checkoutOffer.updateMany({
      where: { checkoutId: id, active: true },
      data: { active: false },
    });
    await tx.checkout.update({
      where: { id },
      data: { state: "REVIEW", version: { increment: 1 } },
    });
    await checkoutEvent(tx, id, "WITHDRAW_OFFER", actor.name, reason, actor.id);
  });
}
