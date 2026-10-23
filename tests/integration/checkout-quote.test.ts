import { quoteFixture } from "../fixtures/checkout-quote";
import { expect, it } from "vitest";
import { setupDatabase } from "./setup";

import { db } from "@/lib/db";

import { transitionQuote } from "@/server/quotes";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import {
  publishCheckoutQuote,
  acceptCheckoutQuote,
} from "@/server/checkout/quotes";
setupDatabase();
it("accepts a frozen valid total and converts once despite catalog changes and retries", async () => {
  const { actor, p, q, id } = await quoteFixture();
  const offer = await publishCheckoutQuote(actor, id, {
    operationKey: "c".repeat(64),
    expectedQuoteVersion: q.version,
    installments: [
      { number: 1, amount: "90.00", dueDate: todaySaoPaulo(new Date()) },
    ],
  });
  expect(offer.total).toBe("90.00");
  await db.product.updateMany({
    data: { price: "120.00", commercialRevision: { increment: 1 } },
  });
  const input = {
    operationKey: "d".repeat(64),
    expectedVersion: offer.version,
    fingerprint: offer.fingerprint,
    name: "Ana",
    agreed: true as const,
  };
  const [a, b] = await Promise.all([
    acceptCheckoutQuote(p, input),
    acceptCheckoutQuote(p, input),
  ]);
  expect(a).toEqual(b);
  expect(await db.sale.count()).toBe(1);
  expect(await db.financialEntry.count()).toBe(1);
  expect(
    (await db.quote.findUniqueOrThrow({ where: { id: q.id } })).status,
  ).toBe("CONVERTIDO");
});
it("rejects reopened quote versions even when a customer still has the previous page", async () => {
  const { actor, p, q, id } = await quoteFixture();
  const offer = await publishCheckoutQuote(actor, id, {
    operationKey: "c".repeat(64),
    expectedQuoteVersion: q.version,
    installments: [
      { number: 1, amount: "90.00", dueDate: todaySaoPaulo(new Date()) },
    ],
  });
  await transitionQuote(actor, q.id, q.version, "REOPEN");
  await expect(
    acceptCheckoutQuote(p, {
      operationKey: "d".repeat(64),
      expectedVersion: offer.version,
      fingerprint: offer.fingerprint,
      name: "Ana",
      agreed: true,
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await db.sale.count()).toBe(0);
});
