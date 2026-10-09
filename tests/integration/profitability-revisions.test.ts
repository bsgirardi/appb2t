import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { sale, meta, date } from "../fixtures/production";
import { adminPayload } from "../fixtures/profitability";
import { saveProfitabilityRevision } from "@/server/profitability/revisions";
setupDatabase();
it("versions revisions, replays once and refuses changed payload or stale role", async () => {
  const a = await seedUser("ADMIN"),
    s = await sale();
  const input = {
    ...meta(),
    saleId: s.id,
    effectiveDate: date(),
    reason: "Conferência inicial",
    payload: adminPayload(),
  };
  const first = await saveProfitabilityRevision(a, input);
  expect((await saveProfitabilityRevision(a, input)).id).toBe(first.id);
  await expect(
    saveProfitabilityRevision(a, { ...input, reason: "Alterado" }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const next = await saveProfitabilityRevision(a, {
    ...input,
    ...meta(1),
    reason: "Correção conferida",
  });
  expect(next.predecessorId).toBe(first.id);
  expect(await db.profitabilityRevision.count()).toBe(2);
  await db.user.update({ where: { id: a.id }, data: { role: "OPERATOR" } });
  await expect(saveProfitabilityRevision(a, input)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
it("only one concurrent revision wins the same expected version", async () => {
  const a = await seedUser("ADMIN"),
    s = await sale();
  const input = {
    saleId: s.id,
    effectiveDate: date(),
    reason: "Conferência inicial",
    payload: adminPayload(),
  };
  const results = await Promise.allSettled([
    saveProfitabilityRevision(a, { ...input, ...meta() }),
    saveProfitabilityRevision(a, { ...input, ...meta() }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(await db.profitabilityRevision.count()).toBe(1);
});
it("refuses duplicate complements and foreign production sources", async () => {
  const a = await seedUser("ADMIN"),
    s = await sale();
  const payload = adminPayload();
  const extra = {
    id: "one",
    lineKey: "line1",
    reference: "invoice/1",
    description: "Embalagem",
    value: "1",
    effectiveDate: date(),
    notInProduction: true as const,
  };
  payload.extras = [extra, { ...extra, id: "two" }];
  await expect(
    saveProfitabilityRevision(a, {
      ...meta(),
      saleId: s.id,
      effectiveDate: date(),
      reason: "Conferência",
      payload,
    }),
  ).rejects.toThrow();
  payload.extras = [];
  payload.confirmations = [
    {
      lineKey: "line1",
      extraKey: "e",
      kind: "U3_SOURCE",
      sourceId: "foreign",
      value: "1",
    },
  ];
  await expect(
    saveProfitabilityRevision(a, {
      ...meta(),
      saleId: s.id,
      effectiveDate: date(),
      reason: "Conferência",
      payload,
    }),
  ).rejects.toThrow();
});
it("preserves the historical channel when unrelated administrative values change", async () => {
  const a = await seedUser("ADMIN"),
    s = await sale();
  const channel = await db.pricingChannel.create({
    data: { name: "Direto", fees: [], fixedCost: "0" },
  });
  const input = {
    ...meta(),
    saleId: s.id,
    effectiveDate: date(),
    reason: "Conferência",
    payload: {
      ...adminPayload(),
      channel: { id: channel.id, version: channel.version, name: channel.name },
    },
  };
  const first = await saveProfitabilityRevision(a, input);
  await db.pricingChannel.update({
    where: { id: channel.id },
    data: { version: 2, name: "Direto novo" },
  });
  const next = await saveProfitabilityRevision(a, {
    ...input,
    ...meta(1),
    payload: { ...first.payload, shipping: { state: "DECLARED", value: "25" } },
  });
  expect(next.payload.channel).toEqual(first.payload.channel);
  expect(next.payload.shipping).toEqual({ state: "DECLARED", value: "25.00" });
});
