import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import {
  createCatalogRequestFixture,
  requestQuoteInput,
} from "../fixtures/catalog-request-db";
import { saveCustomer } from "@/server/customers";
import { changeCatalogRequest } from "@/server/catalog-requests/service";
import { prepareRequestQuote } from "@/server/catalog-requests/prepare-quote";
setupDatabase();
async function fixture(consult = false) {
  const f = await createCatalogRequestFixture(consult);
  await changeCatalogRequest(f.actor, f.request.id, {
    action: "START",
    assigneeId: f.actor.id,
    expectedVersion: 1,
  });
  const customer = await saveCustomer(f.actor, undefined, {
    name: "Revisado",
    type: "PERSON",
    active: true,
  });
  return { ...f, input: requestQuoteInput(customer.id, f.lines), customer };
}
it("prepares one linked draft across concurrent retries and preserves source personalizations", async () => {
  const f = await fixture();
  const results = await Promise.all([
    prepareRequestQuote(f.actor, f.request.id, f.input),
    prepareRequestQuote(f.actor, f.request.id, f.input),
  ]);
  expect(results[0].quote.id).toBe(results[1].quote.id);
  expect(await db.quote.count()).toBe(1);
  expect(results[0].request.state).toBe("ORCAMENTO_PREPARADO");
  expect(
    results[0].quote.input.items!.map(
      (i) => i.catalogOrigin?.snapshot.answers[0].value,
    ),
  ).toEqual(["Ana", "Bia"]);
  expect(
    (
      await prepareRequestQuote(f.actor, f.request.id, {
        ...f.input,
        expectedVersion: 1,
      })
    ).quote.id,
  ).toBe(results[0].quote.id);
  expect(await db.sale.count()).toBe(0);
});
it("requires resolved consultation, chosen active customer and explicit standalone confirmation", async () => {
  const f = await fixture(true);
  await expect(
    prepareRequestQuote(f.actor, f.request.id, {
      ...f.input,
      document: {
        ...f.input.document,
        items: f.input.document.items.map((i) => ({ ...i, unitPrice: "0" })),
      },
    }),
  ).rejects.toThrow();
  await db.customer.update({
    where: { id: f.customer.id },
    data: { active: false },
  });
  await expect(
    prepareRequestQuote(f.actor, f.request.id, f.input),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  await db.customer.update({
    where: { id: f.customer.id },
    data: { active: true },
  });
  await db.product.update({
    where: { id: f.product.id },
    data: { active: false },
  });
  await expect(
    prepareRequestQuote(f.actor, f.request.id, f.input),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  const document = {
    ...f.input.document,
    items: f.input.document.items.map((original) => {
      const item = { ...original };
      delete item.productId;
      return item;
    }),
  };
  const prepared = await prepareRequestQuote(f.actor, f.request.id, {
    ...f.input,
    document,
    sources: f.input.sources.map((s) => ({ ...s, standalone: true })),
  });
  expect(prepared.quote.input.items![0].productId).toBeUndefined();
  expect(prepared.quote.input.items![0].catalogOrigin?.snapshot.productId).toBe(
    f.product.id,
  );
});
it("rolls back quote creation if request linking fails after the quote insert", async () => {
  const f = await fixture();
  await db.$executeRawUnsafe(
    `CREATE FUNCTION c2_fail_link() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state = 'ORCAMENTO_PREPARADO' THEN RAISE EXCEPTION 'test link failure'; END IF; RETURN NEW; END $$`,
  );
  await db.$executeRawUnsafe(
    `CREATE TRIGGER c2_fail_link_trigger BEFORE UPDATE ON "CatalogRequest" FOR EACH ROW EXECUTE FUNCTION c2_fail_link()`,
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
      'DROP TRIGGER c2_fail_link_trigger ON "CatalogRequest"',
    );
    await db.$executeRawUnsafe("DROP FUNCTION c2_fail_link()");
  }
});
it("requires the assigned attendant to remain active before preparing", async () => {
  const f = await fixture();
  const other = await db.user.create({
    data: {
      name: "Atendente",
      email: "other@example.test",
      passwordHash: "test",
    },
  });
  const assigned = await changeCatalogRequest(f.actor, f.request.id, {
    action: "REASSIGN",
    expectedVersion: 2,
    assigneeId: other.id,
  });
  await db.user.update({ where: { id: other.id }, data: { active: false } });
  await expect(
    prepareRequestQuote(f.actor, f.request.id, {
      ...f.input,
      expectedVersion: assigned.version,
    }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  expect(await db.quote.count()).toBe(0);
});
