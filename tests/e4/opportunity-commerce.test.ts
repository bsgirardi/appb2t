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
