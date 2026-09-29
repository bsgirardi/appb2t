import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import {
  saveCustomer,
  listCustomers,
  getCustomer,
  setCustomerActive,
} from "@/server/customers";
setupDatabase();
const input = {
  name: "Cliente de teste",
  type: "PERSON",
  document: "123.456.789-00",
  email: "",
  phone: "",
  address: "",
  notes: "Privado",
  active: true,
};
it.each(["ADMIN", "OPERATOR"] as const)(
  "allows %s to manage customers with version protection",
  async (role) => {
    const actor = await seedUser(role);
    const c = await saveCustomer(actor, undefined, input);
    expect(c.document).toBe("12345678900");
    const inactive = await setCustomerActive(actor, c.id, false, c.version);
    expect(inactive.active).toBe(false);
    expect((await getCustomer(actor, c.id)).notes).toBe("Privado");
    await expect(
      saveCustomer(actor, c.id, { ...input, expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      saveCustomer(actor, undefined, { ...input, email: "invalid" }),
    ).rejects.toThrow();
  },
);
it("accepts no document and filters/paginates without losing totals", async () => {
  const actor = await seedUser();
  await saveCustomer(actor, undefined, { ...input, document: "", name: "Ana" });
  await saveCustomer(actor, undefined, { ...input, name: "Ana Maria" });
  await saveCustomer(actor, undefined, { ...input, name: "Bruno" });
  const page = await listCustomers(actor, {
    search: "Ana",
    pageSize: 1,
    page: 2,
  });
  expect(page.total).toBe(2);
  expect(page.items[0].name).toBe("Ana Maria");
  expect(page.page).toBe(2);
});
it("does not match every document when searching only punctuation", async () => {
  const actor = await seedUser();
  await saveCustomer(actor, undefined, input);
  expect((await listCustomers(actor, { search: "---" })).total).toBe(0);
});
