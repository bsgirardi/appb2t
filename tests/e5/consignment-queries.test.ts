import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { readyFixture, key } from "./fixtures";
import { executePartnerCommand } from "@/server/consignment/partners";
import { executeConsignmentSaleCommand } from "@/server/consignment/sales";
import { listPartners, getPartner } from "@/server/consignment/queries";
import { getConsignmentReport } from "@/server/consignment/reports";
setupDatabase();
it("keeps replenishment independent from outbound pieces and preserves totals across pages", async () => {
  const f = await readyFixture("RETIDA", 4);
  await executePartnerCommand(f.actor, {
    type: "SET_PRODUCT_CONDITION",
    operationKey: key(),
    id: f.partner.id,
    expectedVersion: f.partner.version,
    productId: f.product.id,
    minimum: 5,
    percent: null,
  });
  const page = await listPartners(f.actor, {
    pending: "replenishment",
    pageSize: 1,
  });
  expect(page.total).toBe(1);
  expect(page.items[0].balances[0]).toMatchObject({
    partner: 4,
    outbound: 4,
    replenishment: true,
  });
  expect(page.totals).toMatchObject({ partner: 4, outbound: 4 });
  const emptyPage = await listPartners(f.actor, {
    pending: "replenishment",
    page: 2,
    pageSize: 1,
  });
  expect(emptyPage.items).toHaveLength(0);
  expect(emptyPage.totals).toEqual(page.totals);
});
it("redacts settlement details for operators and blocks monetary reports and confirmation", async () => {
  const f = await readyFixture();
  await f.makeSale();
  const operator = await seedUser("OPERATOR", "operator-e5@example.test");
  const detail = await getPartner(operator, f.partner.id);
  expect(detail.sales[0].finance).toBeNull();
  expect(detail.sales[0].financialLinks).toEqual([]);
  expect(detail.statements).toEqual([]);
  await expect(getConsignmentReport(operator, {})).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  const draft = await f.draftSale();
  await expect(
    executeConsignmentSaleCommand(operator, {
      type: "CONFIRM",
      operationKey: key(),
      id: draft.id,
      expectedVersion: draft.version,
      reason: "",
    }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await db.user.update({ where: { id: operator.id }, data: { active: false } });
  await expect(getPartner(operator, f.partner.id)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
it("continues resolving stock after partner and customer inactivation", async () => {
  const f = await readyFixture();
  await db.partner.update({
    where: { id: f.partner.id },
    data: { active: false },
  });
  await db.customer.update({
    where: { id: f.customer.id },
    data: { active: false },
  });
  expect((await f.makeSale()).status).toBe("CONFIRMED");
});
