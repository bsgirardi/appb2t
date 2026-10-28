import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { fixture, key } from "./fixtures";
import { executeOpportunityCommand as command } from "@/server/opportunities/commands";
import { getOpportunity } from "@/server/opportunities/queries";
import { saveQuote } from "@/server/quotes";
import { convertQuote } from "@/server/sales";
import { db } from "@/lib/db";
setupDatabase();
it("locks customer after binding and only allows a linked primary", async () => {
  const { actor, opportunity: o, quote } = await fixture();
  const q = await quote(false);
  const linked = await command(actor, o.id, {
    action: "LINK_QUOTE",
    operationKey: key(),
    expectedVersion: 1,
    quoteId: q.id,
  });
  expect(linked.principalQuoteId).toBe(q.id);
  expect(linked.stage).toBe("CONTATO");
  await expect(
    saveQuote(actor, q.id, {
      ...q.input,
      customerId: undefined,
      expectedVersion: q.version,
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(
    command(actor, o.id, {
      action: "SET_PRIMARY",
      operationKey: key(),
      expectedVersion: linked.version,
      quoteId: "other",
    }),
  ).rejects.toThrow();
});
it("records gain in the conversion transaction and preserves replay", async () => {
  const { actor, opportunity: o, quote } = await fixture();
  const q = await quote();
  await command(actor, o.id, {
    action: "LINK_QUOTE",
    operationKey: key(),
    expectedVersion: 1,
    quoteId: q.id,
  });
  const operation = key(),
    rows = [{ number: 1, amount: "50.00", dueDate: "2026-10-29" }];
  const sale = await convertQuote(actor, q.id, q.version, rows, operation);
  expect((await getOpportunity(actor, o.id)).wonSale?.id).toBe(sale.id);
  expect((await getOpportunity(actor, o.id)).stage).toBe("GANHO");
  expect((await getOpportunity(actor, o.id)).nextContactDate).toBeNull();
  expect((await convertQuote(actor, q.id, q.version, rows, operation)).id).toBe(
    sale.id,
  );
  expect(await db.sale.count()).toBe(1);
  expect(await db.saleInstallment.count()).toBe(1);
  expect(await db.financialEntry.count({ where: { kind: "RECEIVABLE" } })).toBe(
    1,
  );
});
it("blocks conversion of lost opportunities", async () => {
  const { actor, opportunity: o, quote } = await fixture();
  const q = await quote();
  const linked = await command(actor, o.id, {
    action: "LINK_QUOTE",
    operationKey: key(),
    expectedVersion: 1,
    quoteId: q.id,
  });
  await command(actor, o.id, {
    action: "LOSE",
    operationKey: key(),
    expectedVersion: linked.version,
    reason: "Sem interesse",
  });
  await expect(
    convertQuote(
      actor,
      q.id,
      q.version,
      [{ number: 1, amount: "50.00", dueDate: "2026-10-29" }],
      key(),
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await db.sale.count()).toBe(0);
});

it("links an already converted quote with one version increment and no new commerce events", async () => {
  const { actor, opportunity: o, quote } = await fixture();
  const q = await quote();
  const sale = await convertQuote(
    actor,
    q.id,
    q.version,
    [{ number: 1, amount: "50.00", dueDate: "2026-10-29" }],
    key(),
  );
  const before = {
    events: await db.commerceEvent.count(),
    entries: await db.financialEntry.count(),
    installments: await db.saleInstallment.count(),
  };
  const linked = await command(actor, o.id, {
    action: "LINK_QUOTE",
    operationKey: key(),
    expectedVersion: o.version,
    quoteId: q.id,
  });
  expect(linked.stage).toBe("GANHO");
  expect(linked.wonSale?.id).toBe(sale.id);
  expect(linked.version).toBe(o.version + 1);
  expect(await db.sale.count()).toBe(1);
  expect(await db.commerceEvent.count()).toBe(before.events);
  expect(await db.financialEntry.count()).toBe(before.entries);
  expect(await db.saleInstallment.count()).toBe(before.installments);
  expect(
    await db.opportunityEvent.count({ where: { opportunityId: o.id } }),
  ).toBe(2);
});
it("refuses retroactive adoption of a cancelled sale without changing opportunity", async () => {
  const { actor, opportunity: o, quote } = await fixture();
  const q = await quote();
  const sale = await convertQuote(
    actor,
    q.id,
    q.version,
    [{ number: 1, amount: "50.00", dueDate: "2026-10-29" }],
    key(),
  );
  await db.sale.update({
    where: { id: sale.id },
    data: { status: "CANCELADA" },
  });
  await expect(
    command(actor, o.id, {
      action: "LINK_QUOTE",
      operationKey: key(),
      expectedVersion: o.version,
      quoteId: q.id,
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect((await getOpportunity(actor, o.id)).version).toBe(o.version);
  expect(
    (await db.quote.findUniqueOrThrow({ where: { id: q.id } })).opportunityId,
  ).toBeNull();
});
