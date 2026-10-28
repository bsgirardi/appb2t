import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { fixture, key } from "./fixtures";
import { executeOpportunityCommand as command } from "@/server/opportunities/commands";
import { convertQuote } from "@/server/sales";
import { db } from "@/lib/db";
setupDatabase();
it("serializes conversion of different quotes to one winning sale", async () => {
  const { actor, opportunity: o, quote } = await fixture();
  const a = await quote(),
    b = await quote();
  const linked = await command(actor, o.id, {
    action: "LINK_QUOTE",
    operationKey: key(),
    expectedVersion: 1,
    quoteId: a.id,
  });
  await command(actor, o.id, {
    action: "LINK_QUOTE",
    operationKey: key(),
    expectedVersion: linked.version,
    quoteId: b.id,
  });
  const rows = [{ number: 1, amount: "50.00", dueDate: "2026-10-29" }];
  const results = await Promise.allSettled([
    convertQuote(actor, a.id, a.version, rows, key()),
    convertQuote(actor, b.id, b.version, rows, key()),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(await db.sale.count()).toBe(1);
  expect(await db.saleInstallment.count()).toBe(1);
});

it("serializes linking with an incompatible edit of the same quote", async () => {
  const { actor, opportunity: o, quote } = await fixture();
  const q = await quote(false);
  const { saveCustomer } = await import("@/server/customers"),
    { saveQuote } = await import("@/server/quotes");
  const other = await saveCustomer(actor, undefined, {
    name: "Outro cliente",
    type: "PERSON",
    active: true,
  });
  const results = await Promise.allSettled([
    command(actor, o.id, {
      action: "LINK_QUOTE",
      operationKey: key(),
      expectedVersion: 1,
      quoteId: q.id,
    }),
    saveQuote(actor, q.id, {
      ...q.input,
      customerId: other.id,
      expectedVersion: q.version,
    }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const persisted = await db.quote.findUniqueOrThrow({ where: { id: q.id } });
  expect(
    persisted.opportunityId === o.id
      ? persisted.customerId === o.customerId
      : persisted.customerId === other.id,
  ).toBe(true);
});
it("reconciles concurrent legacy conversion and initial opportunity linking", async () => {
  const { actor, opportunity: o, quote } = await fixture();
  const q = await quote();
  const results = await Promise.allSettled([
    command(actor, o.id, {
      action: "LINK_QUOTE",
      operationKey: key(),
      expectedVersion: 1,
      quoteId: q.id,
    }),
    convertQuote(
      actor,
      q.id,
      q.version,
      [{ number: 1, amount: "50.00", dueDate: "2026-10-29" }],
      key(),
    ),
  ]);
  expect(results.every((r) => r.status === "fulfilled")).toBe(true);
  const persisted = await db.opportunity.findUniqueOrThrow({
    where: { id: o.id },
  });
  expect(persisted.stage).toBe("GANHO");
  expect(persisted.wonSaleId).not.toBeNull();
  expect(await db.sale.count()).toBe(1);
  expect(await db.saleInstallment.count()).toBe(1);
  expect(await db.financialEntry.count()).toBe(1);
});
