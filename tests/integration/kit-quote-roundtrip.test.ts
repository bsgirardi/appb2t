import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { setupDatabase } from "./setup";
import { createC3RequestFixture } from "../fixtures/catalog-c3";
import { prepareRequestQuote } from "@/server/catalog-requests/prepare-quote";
import { saveQuote, transitionQuote } from "@/server/quotes";
import { convertQuote } from "@/server/sales";
import { duplicateDocumentItem } from "@/domain/pricing/document-costs";
import { discountReviewFingerprint } from "@/domain/kits/document";
import { documentSchema } from "@/domain/commerce/validation";
setupDatabase();
async function fixture() {
  const f = await createC3RequestFixture();
  const { quote } = await prepareRequestQuote(f.actor, f.request.id, f.input);
  return { ...f, quote };
}
it("edit_requires_new_discount_ack_and_reorder_preserves_history", async () => {
  const f = await fixture(),
    items = f.quote.input.items!.map((i, n) =>
      n === 0 ? { ...i, unitPrice: "31.00" } : i,
    );
  await expect(
    saveQuote(f.actor, f.quote.id, {
      ...f.quote.input,
      items,
      expectedVersion: f.quote.version,
    }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  const saved = await saveQuote(f.actor, f.quote.id, {
    ...f.quote.input,
    items,
    expectedVersion: f.quote.version,
    kitDiscountReview: {
      fingerprint: discountReviewFingerprint(items, "30.00"),
    },
  });
  expect(saved.totals).toMatchObject({
    subtotal: "222.00",
    discount: "30.00",
    total: "192.00",
  });
  expect(saved.input.catalogKits).toEqual(f.quote.input.catalogKits);
  const { catalogKits: _history, ...withoutHistory } = saved.input;
  void _history;
  const reordered = await saveQuote(f.actor, saved.id, {
    ...withoutHistory,
    items: [...saved.input.items!].reverse(),
    expectedVersion: saved.version,
  });
  expect(
    reordered.input.items!.map((i) => i.catalogOrigin?.sourceLineId),
  ).toEqual(["c", "b", "a"]);
  expect(reordered.input.catalogKits).toEqual(saved.input.catalogKits);
  expect(reordered.events.some((e) => e.action === "KIT_DISCOUNT_REVIEW")).toBe(
    true,
  );
});
it("duplicate_delete_reorder_never_reassign_origin_or_reapply_discount", async () => {
  const f = await fixture(),
    duplicate = duplicateDocumentItem(f.quote.input.items![0]);
  expect(duplicate.catalogOrigin).toBeUndefined();
  let items = [...f.quote.input.items!, duplicate];
  const saved = await saveQuote(f.actor, f.quote.id, {
    ...f.quote.input,
    items,
    expectedVersion: f.quote.version,
    kitDiscountReview: {
      fingerprint: discountReviewFingerprint(items, "30.00"),
    },
  });
  expect(saved.input.items!.map((i) => i.catalogOrigin?.sourceLineId)).toEqual([
    "a",
    "b",
    "c",
    undefined,
  ]);
  items = saved.input.items!.slice(1);
  const removed = await saveQuote(f.actor, saved.id, {
    ...saved.input,
    items,
    expectedVersion: saved.version,
    kitDiscountReview: {
      fingerprint: discountReviewFingerprint(items, "30.00"),
    },
  });
  expect(
    removed.input.items!.map((i) => i.catalogOrigin?.sourceLineId),
  ).toEqual(["b", "c", undefined]);
  expect(removed.input.discount).toBe("30.00");
  expect(removed.input.catalogKits).toEqual(f.quote.input.catalogKits);
  expect(
    removed.input.catalogKits?.receivedLines?.find(
      (line) => line.lineId === "a",
    ),
  ).toMatchObject({ lineId: "a", quantity: 2, unitPrice: "30.00" });
});
it("convert_keeps_final_totals_and_groups_in_emitted_snapshot", async () => {
  const f = await fixture();
  const issued = await transitionQuote(
    f.actor,
    f.quote.id,
    f.quote.version,
    "ISSUE",
  );
  expect(issued.snapshot!.catalogKits).toEqual(f.quote.input.catalogKits);
  const approved = await transitionQuote(
    f.actor,
    issued.id,
    issued.version,
    "APPROVE",
  );
  const sale = await convertQuote(
    f.actor,
    approved.id,
    approved.version,
    [{ number: 1, amount: "190.00", dueDate: "2099-12-31" }],
    randomUUID(),
  );
  expect(sale.totals).toMatchObject({
    subtotal: "220.00",
    discount: "30.00",
    total: "190.00",
  });
  expect(sale.document.catalogKits).toEqual(issued.snapshot!.catalogKits);
  expect(sale.snapshot!.catalogKits).toEqual(issued.snapshot!.catalogKits);
  expect(documentSchema.parse(sale.document).catalogKits).toEqual(
    issued.snapshot!.catalogKits,
  );
});
it("generic_editors_cannot_replace_received_group_history", async () => {
  const f = await fixture();
  await expect(
    saveQuote(f.actor, undefined, f.quote.input),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  const history = f.quote.input.catalogKits!;
  await expect(
    saveQuote(f.actor, f.quote.id, {
      ...f.quote.input,
      expectedVersion: f.quote.version,
      catalogKits: {
        ...history,
        groups: history.groups.map((g, i) =>
          i === 0 ? { ...g, name: "Forjado" } : g,
        ),
      },
    }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
});
