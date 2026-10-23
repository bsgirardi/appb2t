import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { quoteFixture } from "../fixtures/checkout-quote";
import { db } from "@/lib/db";
import { transitionQuote } from "@/server/quotes";
import { convertQuote } from "@/server/sales";
import {
  publishCheckoutQuote,
  acceptCheckoutQuote,
} from "@/server/checkout/quotes";
import { todaySaoPaulo } from "@/domain/commerce/dates";
setupDatabase();
it("reconciles an administrative conversion and recovers its result without inventing public approval", async () => {
  const { actor, p, q, id } = await quoteFixture();
  const approved = await transitionQuote(actor, q.id, q.version, "APPROVE");
  const rows = [
    { number: 1, amount: "90.00", dueDate: todaySaoPaulo(new Date()) },
  ];
  const offer = await publishCheckoutQuote(actor, id, {
    operationKey: "c".repeat(64),
    expectedQuoteVersion: approved.version,
    installments: rows,
  });
  const sale = await convertQuote(
    actor,
    q.id,
    approved.version,
    rows,
    "team-conversion",
  );
  expect((await db.checkout.findUniqueOrThrow({ where: { id } })).saleId).toBe(
    sale.id,
  );
  const result = await acceptCheckoutQuote(p, {
    operationKey: "d".repeat(64),
    expectedVersion: offer.version,
    fingerprint: offer.fingerprint,
    name: "Ana",
    agreed: true,
  });
  expect(result.state).toBe("CONFIRMED");
  expect(await db.sale.count()).toBe(1);
  expect(
    await db.commerceEvent.count({
      where: { quoteId: q.id, action: "APPROVE", authorKind: "CHECKOUT" },
    }),
  ).toBe(0);
});
