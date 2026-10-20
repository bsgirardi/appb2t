import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import { createCatalogRequestFixture } from "../fixtures/catalog-request-db";
import { changeCatalogRequest } from "@/server/catalog-requests/service";
import {
  getCatalogRequest,
  listCatalogRequests,
  findRequestCustomers,
} from "@/server/catalog-requests/queries";
import { saveCustomer } from "@/server/customers";
setupDatabase();
it("transitions with version checks, active ownership, mandatory reasons and immutable receipt", async () => {
  const { actor, request, lines } = await createCatalogRequestFixture();
  const started = await changeCatalogRequest(actor, request.id, {
    action: "START",
    assigneeId: actor.id,
    expectedVersion: 1,
  });
  expect(started.state).toBe("EM_ATENDIMENTO");
  expect(started.version).toBe(2);
  await expect(
    changeCatalogRequest(actor, request.id, {
      action: "CLOSE",
      note: "outdated",
      expectedVersion: 1,
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(
    changeCatalogRequest(actor, request.id, {
      action: "CLOSE",
      note: "",
      expectedVersion: 2,
    }),
  ).rejects.toThrow();
  await expect(
    changeCatalogRequest(actor, request.id, {
      action: "NOTE",
      note: "x".repeat(2001),
      expectedVersion: 2,
    }),
  ).rejects.toThrow();
  const closed = await changeCatalogRequest(actor, request.id, {
    action: "CLOSE",
    note: "Cliente desistiu",
    expectedVersion: 2,
  });
  const reopened = await changeCatalogRequest(actor, request.id, {
    action: "REOPEN",
    assigneeId: actor.id,
    expectedVersion: closed.version,
  });
  expect(reopened.lines).toEqual(lines);
  expect(reopened.events).toHaveLength(4);
  await db.user.update({ where: { id: actor.id }, data: { active: false } });
  await expect(
    changeCatalogRequest(actor, request.id, {
      action: "REASSIGN",
      assigneeId: actor.id,
      expectedVersion: reopened.version,
    }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
});
it("provides a paginated summary without full contacts and suggestions never auto-link a customer", async () => {
  const { actor, request, receipt } = await createCatalogRequestFixture();
  const customer = await saveCustomer(actor, undefined, {
    name: "Cliente com outro nome",
    type: "PERSON",
    active: true,
    phone: "(11) 99999-9999",
  });
  const list = await listCatalogRequests(actor, { search: receipt.protocol });
  expect(list.pageSize).toBe(20);
  expect(list.total).toBe(1);
  expect(list.items[0]).not.toHaveProperty("contact");
  expect(
    (await findRequestCustomers(actor, request.id, "")).map((c) => c.id),
  ).toContain(customer.id);
  expect((await getCatalogRequest(actor, request.id)).quoteId).toBeNull();
  expect(await db.quote.count()).toBe(0);
});
