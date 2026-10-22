import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { createC3RequestFixture } from "../fixtures/catalog-c3";
import { prepareRequestQuote } from "@/server/catalog-requests/prepare-quote";
import { saveKit } from "@/server/kits/service";
import { kitPreparationReview } from "@/domain/kits/document";
setupDatabase();
it("two_kits_plus_manual_discount_once_and_concurrent_prepare_one_quote", async () => {
  const f = await createC3RequestFixture();
  const result = await Promise.all([
    prepareRequestQuote(f.actor, f.request.id, f.input),
    prepareRequestQuote(f.actor, f.request.id, f.input),
  ]);
  expect(result[0].quote.id).toBe(result[1].quote.id);
  expect(await db.quote.count()).toBe(1);
  expect(result[0].quote.totals).toMatchObject({
    subtotal: "220.00",
    discount: "30.00",
    total: "190.00",
  });
  expect(result[0].quote.input.items!.map((i) => i.unitPrice)).toEqual([
    "30.00",
    "20.00",
    "20.00",
  ]);
  expect(result[0].quote.input.catalogKits).toMatchObject({
    requestId: f.request.id,
    preparation: {
      kitDiscount: "25.00",
      additionalDiscount: "5.00",
      totalDiscount: "30.00",
    },
  });
});
it("prepared_discount_uses_received_table_after_catalog_changes", async () => {
  const f = await createC3RequestFixture();
  await saveKit(f.actor, f.kit.id, {
    ...f.definition,
    tiers: [{ minQuantity: 1, kind: "FIXED", amount: "99" }],
    expectedVersion: 1,
  });
  const document = {
    ...f.input.document,
    discount: "64.00",
    items: f.input.document.items.map((i, n) =>
      n === 0 ? { ...i, quantity: 7 } : i,
    ),
  };
  const result = await prepareRequestQuote(f.actor, f.request.id, {
    ...f.input,
    document,
    additionalDiscount: "0.00",
    kitReviewFingerprint: kitPreparationReview(
      document.items,
      f.input.sources,
      document.discount,
    ),
  });
  expect(result.quote.input.catalogKits!.preparation.groups[0]).toMatchObject({
    quantity: 10,
    subtotal: "270.00",
    discount: "54.00",
  });
  expect(result.quote.totals).toMatchObject({
    subtotal: "370.00",
    discount: "64.00",
    total: "306.00",
  });
});
it("consult_resolved_before_discount_and_requires_review_of_actual_values", async () => {
  const f = await createC3RequestFixture(true);
  await expect(
    prepareRequestQuote(f.actor, f.request.id, {
      ...f.input,
      document: {
        ...f.input.document,
        items: f.input.document.items.map((i, n) =>
          n === 0 ? { ...i, unitPrice: "0" } : i,
        ),
      },
    }),
  ).rejects.toThrow();
  const document = {
    ...f.input.document,
    items: f.input.document.items.map((i, n) =>
      n === 0 ? { ...i, unitPrice: "30.00" } : i,
    ),
  };
  await expect(
    prepareRequestQuote(f.actor, f.request.id, { ...f.input, document }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  const result = await prepareRequestQuote(f.actor, f.request.id, {
    ...f.input,
    document,
    kitReviewFingerprint: kitPreparationReview(
      document.items,
      f.input.sources,
      document.discount,
    ),
  });
  expect(result.quote.totals!.total).toBe("190.00");
});
it("rollback_after_quote_insert_keeps_request_and_history_atomic", async () => {
  const f = await createC3RequestFixture();
  await db.$executeRawUnsafe(
    `CREATE FUNCTION c3_fail_link() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state = 'ORCAMENTO_PREPARADO' THEN RAISE EXCEPTION 'test link failure'; END IF; RETURN NEW; END $$`,
  );
  await db.$executeRawUnsafe(
    'CREATE TRIGGER c3_fail_link_trigger BEFORE UPDATE ON "CatalogRequest" FOR EACH ROW EXECUTE FUNCTION c3_fail_link()',
  );
  try {
    await expect(
      prepareRequestQuote(f.actor, f.request.id, f.input),
    ).rejects.toThrow();
    expect(await db.quote.count()).toBe(0);
    expect(
      (
        await db.catalogRequest.findUniqueOrThrow({
          where: { id: f.request.id },
        })
      ).state,
    ).toBe("EM_ATENDIMENTO");
  } finally {
    await db.$executeRawUnsafe(
      'DROP TRIGGER c3_fail_link_trigger ON "CatalogRequest"',
    );
    await db.$executeRawUnsafe("DROP FUNCTION c3_fail_link()");
  }
});
