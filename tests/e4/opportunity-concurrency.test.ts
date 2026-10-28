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
