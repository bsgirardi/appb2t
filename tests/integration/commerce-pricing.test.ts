import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { pricingFixture } from "../fixtures/pricing-db";
import { db } from "@/lib/db";
import { createPricingEstimate } from "@/server/pricing/estimates";
import { saveQuote, getQuote, transitionQuote } from "@/server/quotes";
import { saveSaleDraft, confirmSale, convertQuote } from "@/server/sales";
import { saveCustomer } from "@/server/customers";
import { saveDocumentCosts } from "@/server/pricing/document-costs";
setupDatabase();
async function fixture() {
  const f = await pricingFixture();
  const customer = await saveCustomer(f.actor, undefined, {
    name: "Cliente",
    type: "PERSON",
    active: true,
    notes: "",
  });
  const snapshot = await createPricingEstimate(
    f.actor,
    f.request,
    randomUUID(),
  );
  const input = {
    customerId: customer.id,
    items: [
      {
        lineId: randomUUID(),
        description: "Peça A",
        quantity: 10,
        unitPrice: "8.00",
      },
      {
        lineId: randomUUID(),
        description: "Peça B",
        quantity: 10,
        unitPrice: "9.00",
      },
    ],
    discount: "0.00",
    shipping: "0.00",
    paymentTerms: "Pix",
    internalNotes: "",
    validUntil: "2099-12-31",
  };
  const costBindings = [
    { lineId: input.items[0].lineId, snapshotId: snapshot.id },
  ];
  return { ...f, input, snapshot, costBindings };
}
it("reorderKeepsCostsOnLine, quantityChangeMarksStale and old clients cannot erase identity", async () => {
  const f = await fixture();
  let q = await saveQuote(f.actor, undefined, {
    ...f.input,
    costBindings: f.costBindings,
  });
  q = await saveQuote(f.actor, q.id, {
    ...q.input,
    items: [q.input.items![1], { ...q.input.items![0], unitPrice: "10.00" }],
    expectedVersion: q.version,
  });
  expect(q.costs?.bindings).toMatchObject([
    { lineId: f.input.items[0].lineId, state: "VALID" },
  ]);
  await expect(
    saveQuote(f.actor, q.id, {
      ...q.input,
      items: q.input.items!.map(({ lineId, ...i }) => {
        void lineId;
        return i;
      }),
      expectedVersion: q.version,
    }),
  ).rejects.toThrow(/atualiz/i);
  expect((await getQuote(f.actor, q.id)).version).toBe(q.version);
  q = await saveQuote(f.actor, q.id, {
    ...q.input,
    items: q.input.items!.map((i) => ({ ...i, quantity: 11 })),
    expectedVersion: q.version,
  });
  expect(q.costs?.bindings[0].state).toBe("STALE");
  await expect(
    transitionQuote(f.actor, q.id, q.version, "ISSUE"),
  ).rejects.toThrow(/estimativa/i);
  await expect(
    saveQuote(f.actor, q.id, {
      ...q.input,
      costBindings: [
        { ...f.costBindings[0], fingerprint: "forged", state: "VALID" },
      ],
      expectedVersion: q.version,
    }),
  ).rejects.toThrow();
  q = await saveQuote(f.actor, q.id, {
    ...q.input,
    costBindings: [],
    expectedVersion: q.version,
  });
  expect(
    (await transitionQuote(f.actor, q.id, q.version, "ISSUE")).status,
  ).toBe("ENVIADO");
});
it("issuedCostDoesNotFollowTariffs, reopenPreservesFrozenRevision, concurrentConvertCopiesOnce", async () => {
  const f = await fixture();
  let q = await saveQuote(f.actor, undefined, {
    ...f.input,
    costBindings: f.costBindings,
  });
  q = await transitionQuote(f.actor, q.id, q.version, "ISSUE");
  const frozen = q.costs!;
  expect(JSON.stringify(q.snapshot)).not.toMatch(
    /lineId|snapshotId|energyRate|fullCost/,
  );
  await db.material.update({
    where: { id: f.material.id },
    data: { price: "999", active: false },
  });
  expect((await getQuote(f.actor, q.id)).costs).toEqual(frozen);
  q = await transitionQuote(f.actor, q.id, q.version, "REOPEN");
  q = await saveQuote(f.actor, q.id, {
    ...q.input,
    expectedVersion: q.version,
  });
  expect(q.costs?.revisionId).not.toBe(frozen.revisionId);
  expect(
    (
      await db.documentCostRevision.findUniqueOrThrow({
        where: { id: frozen.revisionId },
      })
    ).frozenAt,
  ).not.toBeNull();
  q = await transitionQuote(f.actor, q.id, q.version, "ISSUE");
  q = await transitionQuote(f.actor, q.id, q.version, "APPROVE");
  const key = randomUUID();
  const rows = [{ number: 1, amount: "170.00", dueDate: "2099-12-31" }];
  const [a, b] = await Promise.all([
    convertQuote(f.actor, q.id, q.version, rows, key),
    convertQuote(f.actor, q.id, q.version, rows, key),
  ]);
  expect(a.id).toBe(b.id);
  expect(a.costs?.snapshots).toEqual(frozen.snapshots);
  expect(await db.documentCostRevision.count({ where: { saleId: a.id } })).toBe(
    1,
  );
  expect(await db.saleInstallment.count({ where: { saleId: a.id } })).toBe(1);
  expect(
    (
      await db.documentCostRevision.findUniqueOrThrow({
        where: { id: a.costs!.revisionId },
      })
    ).sourceRevisionId,
  ).toBe(q.costs!.revisionId);
});
it("legacy keys are derived without writes and persisted on save; duplicate keys rejected", async () => {
  const f = await fixture();
  const { items, ...rest } = f.input;
  const legacy = items.map(({ lineId, ...i }) => {
    void lineId;
    return i;
  });
  const q = await db.quote.create({
    data: {
      input: { ...rest, items: legacy },
      items: { create: legacy.map((i, position) => ({ ...i, position })) },
    },
  });
  const before = await db.quote.findUniqueOrThrow({ where: { id: q.id } });
  const read = await getQuote(f.actor, q.id);
  expect(read.input.items![0].lineId).toMatch(/^legacy:/);
  expect(await db.quote.findUniqueOrThrow({ where: { id: q.id } })).toEqual(
    before,
  );
  const saved = await saveQuote(f.actor, q.id, {
    ...read.input,
    expectedVersion: read.version,
  });
  expect(saved.input.items).toEqual(read.input.items);
  expect(
    (
      await db.quoteItem.findFirstOrThrow({
        where: { quoteId: q.id, position: 0 },
      })
    ).lineKey,
  ).toBe(read.input.items![0].lineId);
  await expect(
    saveQuote(f.actor, undefined, { ...f.input, items: [items[0], items[0]] }),
  ).rejects.toThrow();
});
it("direct sales freeze costs and reject foreign previous revisions", async () => {
  const f = await fixture();
  const { validUntil, ...document } = f.input;
  void validUntil;
  let s = await saveSaleDraft(f.actor, undefined, {
    ...document,
    costBindings: f.costBindings,
  });
  const q = await saveQuote(f.actor, undefined, {
    ...f.input,
    costBindings: f.costBindings,
  });
  await expect(
    db.$transaction((tx) =>
      saveDocumentCosts(
        tx,
        f.actor,
        { saleId: s.id },
        s.document.items,
        f.costBindings,
        q.costs!.revisionId,
      ),
    ),
  ).rejects.toThrow(/documento/i);
  s = await confirmSale(
    f.actor,
    s.id,
    s.version,
    [{ number: 1, amount: "170.00", dueDate: "2099-12-31" }],
    randomUUID(),
  );
  expect(
    (
      await db.documentCostRevision.findUniqueOrThrow({
        where: { id: s.costs!.revisionId },
      })
    ).frozenAt,
  ).not.toBeNull();
});
