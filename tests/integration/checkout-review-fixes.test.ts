import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { quoteFixture } from "../fixtures/checkout-quote";
import { db } from "@/lib/db";
import { saveQuote, transitionQuote } from "@/server/quotes";
import { convertQuote, cancelSale } from "@/server/sales";
import {
  publishCheckoutQuote,
  acceptCheckoutQuote,
} from "@/server/checkout/quotes";
import {
  requestCheckoutCancellation,
  resolveCheckoutCancellation,
} from "@/server/checkout/cancellations";
import { getCheckoutDetail } from "@/server/checkout/queries";
import { todaySaoPaulo } from "@/domain/commerce/dates";
setupDatabase();
const rows = (amount = "90.00") => [
  { number: 1, amount, dueDate: todaySaoPaulo(new Date()) },
];
it("preserves terminal checkout cancellation when the linked quote changes", async () => {
  const { actor, p, q, id } = await quoteFixture();
  await publishCheckoutQuote(actor, id, {
    operationKey: "c".repeat(64),
    expectedQuoteVersion: q.version,
    installments: rows(),
  });
  await requestCheckoutCancellation(
    p,
    "Cancelar antes de confirmar",
    "d".repeat(64),
  );
  const c = await db.checkout.findUniqueOrThrow({ where: { id } });
  await resolveCheckoutCancellation(
    actor,
    id,
    c.version,
    "COMPLETE",
    "Pedido encerrado",
  );
  const approved = await transitionQuote(actor, q.id, q.version, "APPROVE");
  expect((await db.checkout.findUniqueOrThrow({ where: { id } })).state).toBe(
    "CLOSED",
  );
  await expect(
    convertQuote(actor, q.id, approved.version, rows(), "cancelled-convert"),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await db.sale.count()).toBe(0);
});
it("projects new quote items completely without borrowing positional personalization", async () => {
  const { actor, q, id } = await quoteFixture();
  const c = await db.checkout.findUniqueOrThrow({ where: { id } });
  const review = c.review as { lines: Record<string, unknown>[] };
  review.lines[0].color = "Azul";
  review.lines[0].answerLabels = [
    { fieldId: "name", label: "Nome", valueLabel: "Ana" },
  ];
  await db.checkout.update({
    where: { id },
    data: { review: JSON.parse(JSON.stringify(review)) },
  });
  const reopened = await transitionQuote(actor, q.id, q.version, "REOPEN");
  let edited = await saveQuote(actor, q.id, {
    ...reopened.input,
    items: [
      {
        lineId: "extra",
        description: "Serviço adicional",
        quantity: 1,
        unitPrice: "20.00",
      },
      ...reopened.input.items!,
    ],
    expectedVersion: reopened.version,
  });
  edited = await transitionQuote(actor, q.id, edited.version, "ISSUE");
  const offer = await publishCheckoutQuote(actor, id, {
    operationKey: "c".repeat(64),
    expectedQuoteVersion: edited.version,
    installments: rows("110.00"),
  });
  expect(offer.lines[0].answerLabels).toEqual([]);
  expect(offer.lines[0].color).toBe("");
  expect(offer.lines[1].lineId).toBe("ana");
});
it("reconciles administrative cancellation with the public state and pending request", async () => {
  const { actor, p, q, id } = await quoteFixture();
  const offer = await publishCheckoutQuote(actor, id, {
    operationKey: "c".repeat(64),
    expectedQuoteVersion: q.version,
    installments: rows(),
  });
  await acceptCheckoutQuote(p, {
    operationKey: "d".repeat(64),
    expectedVersion: offer.version,
    fingerprint: offer.fingerprint,
    name: "Ana",
    agreed: true,
  });
  await requestCheckoutCancellation(p, "Cancelar a compra", "e".repeat(64));
  const sale = await db.sale.findFirstOrThrow();
  await cancelSale(actor, sale.id, sale.version, "Conferido internamente");
  const detail = await getCheckoutDetail(p);
  expect(detail.receipt?.state).toBe("CLOSED");
  expect(detail.cancellation?.state).toBe("COMPLETED");
});
it("shows the actual installments from an administrative conversion rather than the previous offer", async () => {
  const { actor, p, q, id } = await quoteFixture();
  const approved = await transitionQuote(actor, q.id, q.version, "APPROVE");
  await publishCheckoutQuote(actor, id, {
    operationKey: "c".repeat(64),
    expectedQuoteVersion: approved.version,
    installments: rows(),
  });
  const actual = [
    { number: 1, amount: "30.00", dueDate: "2099-01-01" },
    { number: 2, amount: "30.00", dueDate: "2099-02-01" },
    { number: 3, amount: "30.00", dueDate: "2099-03-01" },
  ];
  await convertQuote(
    actor,
    q.id,
    approved.version,
    actual,
    "different-installments",
  );
  expect((await getCheckoutDetail(p)).review.installments).toEqual(actual);
});
