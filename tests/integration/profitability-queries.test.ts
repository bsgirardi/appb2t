import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase, seedUser } from "./setup";
import { profitabilitySale } from "../fixtures/profitability-db";
import {
  getProfitabilityReport,
  getSaleProfitability,
} from "@/server/profitability/queries";
setupDatabase();
it("uses confirmation in Sao Paulo and keeps totals independent from pagination", async () => {
  const a = await seedUser("ADMIN"),
    s = await profitabilitySale(a.id);
  await profitabilitySale(a.id);
  await db.commerceEvent.updateMany({
    where: { saleId: s.saleId },
    data: { action: "CONVERT", createdAt: new Date("2026-10-09T02:59:59Z") },
  });
  const day8 = await getProfitabilityReport(a, {
    from: "2026-10-08",
    to: "2026-10-08",
  });
  expect(day8.total).toBe(1);
  const filter = { from: "2026-10-08", to: "2026-10-09", pageSize: "1" };
  const p1 = await getProfitabilityReport(a, filter),
    p2 = await getProfitabilityReport(a, { ...filter, page: "2" });
  expect(p1.summary).toEqual(p2.summary);
  expect(p1.items[0].saleId).not.toBe(p2.items[0].saleId);
  await expect(
    getProfitabilityReport(a, { from: "2026-02-30", to: "2026-10-09" }),
  ).rejects.toThrow();
  await expect(
    getProfitabilityReport(a, { from: "2026-10-10", to: "2026-10-09" }),
  ).rejects.toThrow();
});
it("separates undated/canceled sales and refuses non-admin detail", async () => {
  const a = await seedUser("ADMIN"),
    s = await profitabilitySale(a.id);
  await db.commerceEvent.deleteMany({ where: { saleId: s.saleId } });
  expect((await getProfitabilityReport(a, { undated: "true" })).total).toBe(1);
  await db.sale.update({
    where: { id: s.saleId },
    data: { status: "CANCELADA" },
  });
  expect((await getProfitabilityReport(a, { undated: "true" })).total).toBe(0);
  expect(
    (
      await getProfitabilityReport(a, {
        undated: "true",
        situation: "EXCEPTIONS",
      })
    ).total,
  ).toBe(1);
  const op = await seedUser("OPERATOR", "op@example.test");
  await expect(getSaleProfitability(op, s.saleId)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
it("filters unavailable contribution when an order has no cost sources", async () => {
  const a = await seedUser("ADMIN");
  const { sale } = await import("../fixtures/production");
  const s = await sale();
  await db.sale.update({
    where: { id: s.id },
    data: {
      totals: { subtotal: "100", discount: "0", shipping: "0", total: "100" },
    },
  });
  const report = await getProfitabilityReport(a, {
    undated: "true",
    coverage: "UNAVAILABLE",
  });
  expect(report.items.map((x) => x.saleId)).toContain(s.id);
  expect(report.items[0].actual.contribution.coverage).toBe("UNAVAILABLE");
});
