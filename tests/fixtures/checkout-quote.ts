import { checkoutFixture } from "./checkout";
import { db } from "@/lib/db";
import { prepareCheckout, confirmCheckout } from "@/server/checkout/confirm";
import { saveCustomer } from "@/server/customers";
import { saveQuote, transitionQuote } from "@/server/quotes";
import { todaySaoPaulo } from "@/domain/commerce/dates";

export async function quoteFixture() {
  const { actor, draft: pickup, product } = await checkoutFixture(false);
  const draft = {
    ...pickup,
    delivery: {
      mode: "TEAM_SHIPPING" as const,
      address: {
        recipient: "Ana",
        postalCode: "01001000",
        street: "Rua A",
        number: "1",
        complement: "",
        district: "Centro",
        city: "São Paulo",
        state: "SP",
      },
    },
  };
  await db.checkoutSession.create({
    data: { id: "s", expiresAt: new Date(Date.now() + 86400000) },
  });
  const p = { sessionId: "s", checkoutId: null };
  const r = await prepareCheckout(p, draft, "a".repeat(64));
  await confirmCheckout(p, {
    operationKey: "b".repeat(64),
    expectedVersion: r.version,
    fingerprint: r.fingerprint,
    name: "Ana",
    agreed: true,
  });
  const customer = await saveCustomer(actor, undefined, {
    name: "Ana",
    type: "PERSON",
    active: true,
  });
  let q = await saveQuote(actor, undefined, {
    customerId: customer.id,
    items: [
      {
        lineId: "ana",
        productId: product.id,
        description: "Peça revisada",
        quantity: 1,
        unitPrice: "80.00",
      },
    ],
    discount: "0.00",
    shipping: "10.00",
    paymentTerms: "Externo",
    internalNotes: "Informação privada",
    validUntil: todaySaoPaulo(new Date()),
  });
  q = await transitionQuote(actor, q.id, q.version, "ISSUE");
  const c = await db.checkout.findUniqueOrThrow({ where: { id: r.id } });
  await db.catalogRequest.update({
    where: { id: c.requestId! },
    data: { quoteId: q.id, state: "ORCAMENTO_PREPARADO" },
  });
  return { actor, p, q, id: r.id };
}
