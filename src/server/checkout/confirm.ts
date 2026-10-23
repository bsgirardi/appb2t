import type {
  CheckoutDraft,
  CheckoutPrincipal,
  CheckoutReview,
  CheckoutDecisionInput,
  CheckoutReceipt,
} from "@/domain/checkout/types";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import {
  checkoutDraftSchema,
  checkoutDecisionSchema,
} from "@/domain/checkout/validation";
import { attemptKeySchema } from "@/domain/catalog-requests/validation";
import { lockOperation } from "@/server/commerce/locks";
import { lockPlanning } from "@/server/planning/coordination";
import {
  authorizedSession,
  lockCheckout,
  runCheckoutCommand,
  json,
  checkoutEvent,
} from "./commands";
import {
  reviewCheckout,
  checkoutFingerprint,
  checkoutLineDescription,
} from "./review";
import { reviewOf, receiptOf } from "./queries";
import { createCheckoutCustomer } from "./customers";
import { storeRequestSnapshot } from "@/server/catalog-requests/receive";
import { confirmSaleWithClient } from "@/server/commerce/sale-write";
import { itemColumns } from "@/server/pricing/document-costs";
import { calculateDocumentTotals } from "@/domain/commerce/totals";
import {
  calculatePreparedKitDiscount,
  catalogKitDocumentSchema,
} from "@/domain/kits/document";
import { documentSchema } from "@/domain/commerce/validation";
import { syncDocumentArt } from "@/server/art/documents";
import { consumeCheckoutQuotaTx } from "./quota";
export async function prepareCheckout(
  p: CheckoutPrincipal,
  raw: CheckoutDraft,
  key: string,
): Promise<CheckoutReview> {
  const draft = checkoutDraftSchema.parse(raw);
  attemptKeySchema.parse(key);
  return db.$transaction(
    async (tx) => {
      const session = await authorizedSession(tx, p);
      if (session.accessId)
        throw new AppError(
          "FORBIDDEN",
          "Este acesso permite apenas continuar o pedido existente.",
        );
      await lockOperation(tx, `checkout:prepare:${session.id}`);
      await lockPlanning(tx);
      const old = session.checkoutId
        ? await lockCheckout(tx, session.checkoutId)
        : null;
      if (old?.acceptedAt)
        throw new AppError(
          "CONFLICT",
          "Pedido já enviado. Abra uma nova compra explicitamente.",
        );
      const contentHash = checkoutFingerprint(draft);
      const attemptHash = checkoutFingerprint({ session: session.id, key });
      if (old?.attemptHash === attemptHash) {
        if (old.contentHash !== contentHash) throw conflict();
        return reviewOf(old);
      }
      await consumeCheckoutQuotaTx(tx, `review:${session.id}`, 60);
      const review = await reviewCheckout(tx, draft);
      const data = {
        draft: json(draft),
        review: json(review),
        fingerprint: checkoutFingerprint(review),
        contentHash,
        attemptHash,
      };
      const row = old
        ? await tx.checkout.update({
            where: { id: old.id },
            data: { ...data, version: { increment: 1 } },
          })
        : await tx.checkout.create({ data });
      await tx.checkoutSession.update({
        where: { id: session.id },
        data: { checkoutId: row.id },
      });
      return reviewOf(row);
    },
    { timeout: 20000 },
  );
}
export async function confirmCheckout(
  p: CheckoutPrincipal,
  raw: CheckoutDecisionInput,
): Promise<CheckoutReceipt> {
  const input = checkoutDecisionSchema.parse(raw);
  return runCheckoutCommand(
    p,
    "CONFIRM",
    input.operationKey,
    input,
    async (tx, id) => {
      const row = await tx.checkout.findUniqueOrThrow({ where: { id } });
      if (
        row.acceptedAt ||
        row.version !== input.expectedVersion ||
        row.fingerprint !== input.fingerprint
      )
        throw conflict();
      const draft = checkoutDraftSchema.parse(row.draft);
      const review = await reviewCheckout(tx, draft);
      if (checkoutFingerprint(review) !== input.fingerprint)
        throw new AppError(
          "CONFLICT",
          "As condições mudaram. Revise o total e confirme novamente.",
        );
      const request = await storeRequestSnapshot(
        tx,
        { ...draft, attemptKey: input.operationKey },
        `checkout:${id}`,
        row.contentHash,
        {
          lines: review.lines,
          groups: review.groups,
          knownTotal: review.total,
          consultCount: review.lines.filter((l) => l.priceKind === "CONSULT")
            .length,
        },
      );
      let saleId: string | null = null;
      if (review.route === "DIRECT") {
        const customer = await createCheckoutCustomer(tx, id, review);
        const items = review.lines.map((l) => ({
          lineId: l.lineId,
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice!,
          description: checkoutLineDescription(l),
          catalogOrigin: {
            schemaVersion: 1 as const,
            requestId: request.id,
            sourceLineId: l.lineId,
            snapshot: l,
          },
        }));
        const sources = items.map((i) => ({
          lineId: i.lineId,
          sourceLineId: i.lineId,
          standalone: false,
        }));
        const kitCalculation = review.groups.length
          ? calculatePreparedKitDiscount(review.groups, items, sources)
          : null;
        const catalogKits = kitCalculation
          ? catalogKitDocumentSchema.parse({
              schemaVersion: 1,
              requestId: request.id,
              receivedLines: review.lines,
              groups: review.groups,
              preparation: {
                groups: kitCalculation.groups,
                sources: sources.map(({ lineId, sourceLineId }) => ({
                  lineId,
                  sourceLineId,
                })),
                kitDiscount: kitCalculation.discount,
                additionalDiscount: "0.00",
                totalDiscount: review.discount,
              },
            })
          : undefined;
        const document = documentSchema.parse({
          customerId: customer.id,
          items,
          discount: review.discount,
          shipping: review.shipping!,
          paymentTerms: review.paymentTerms,
          internalNotes: "",
          ...(catalogKits ? { catalogKits } : {}),
        });
        const sale = await tx.sale.create({
          data: {
            customerId: customer.id,
            document: json(document),
            totals: json(
              calculateDocumentTotals(items, review.discount, review.shipping!),
            ),
          },
        });
        await tx.saleItem.createMany({
          data: items.map((i, position) => ({
            ...itemColumns(i, position),
            saleId: sale.id,
            position,
          })),
        });
        await syncDocumentArt(tx, { saleId: sale.id }, document.items);
        await confirmSaleWithClient(
          tx,
          { kind: "CHECKOUT", checkoutId: id, name: input.name },
          {
            id: sale.id,
            expectedVersion: sale.version,
            rows: review.installments,
          },
        );
        saleId = sale.id;
        await tx.catalogRequest.update({
          where: { id: request.id },
          data: { state: "ENCERRADA" },
        });
      }
      const updated = await tx.checkout.update({
        where: { id },
        data: {
          requestId: request.id,
          saleId,
          state: saleId ? "CONFIRMED" : "REVIEW",
          acceptedAt: new Date(),
          version: { increment: 1 },
        },
      });
      await checkoutEvent(
        tx,
        id,
        saleId ? "CONFIRMED" : "SENT_FOR_REVIEW",
        input.name,
      );
      return (await receiptOf(tx, updated))!;
    },
  );
}
