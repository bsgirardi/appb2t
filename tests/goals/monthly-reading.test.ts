import { afterAll, expect, it, vi } from "vitest";
import { setupDatabase } from "../integration/setup";
import { db } from "@/lib/db";
import { readMonthlyGoal } from "@/server/profitability/monthly-goals";
import { getProfitabilityReport } from "@/server/profitability/queries";
import { profitabilitySale } from "../fixtures/profitability-db";
const actor = {
  id: "goals-reading-admin",
  name: "Sintético",
  email: "reading-goals@example.test",
  role: "ADMIN" as const,
};
setupDatabase();
afterAll(async () => {
  vi.useRealTimers();
  await db.$disconnect();
});
it("uses the existing monthly cohort and recalculates old months without changing target history", async () => {
  await db.user.create({ data: { ...actor, passwordHash: "unusable" } });
  const a = await profitabilitySale(actor.id, "OPENING");
  const b = await profitabilitySale(actor.id, "OPENING");
  const c = await profitabilitySale(actor.id, "OPENING");
  await db.commerceEvent.updateMany({
    where: { saleId: a.saleId, action: "CONFIRM" },
    data: { createdAt: new Date("2079-11-01T02:59:59Z") },
  });
  await db.commerceEvent.updateMany({
    where: { saleId: b.saleId, action: "CONFIRM" },
    data: { createdAt: new Date("2079-11-01T03:00:00Z") },
  });
  await db.commerceEvent.updateMany({
    where: { saleId: c.saleId, action: "CONFIRM" },
    data: { createdAt: new Date("2079-12-01T03:00:00Z") },
  });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2080-01-01T12:00:00Z"));
  const read = await readMonthlyGoal(actor, { month: "2079-11" });
  const report = await getProfitabilityReport(actor, {
    from: "2079-11-01",
    to: "2079-11-30",
  });
  expect(read.summary).toEqual(report.summary);
  expect(read.summary.count).toBe(1);
  expect(read.summary.revenue).toBe("200");
  expect(read.values).toEqual({
    revenue: null,
    contribution: null,
    orders: null,
  });
  expect(read.performance.revenue.projection).toBeNull();
  await db.sale.update({
    where: { id: b.saleId },
    data: { status: "CANCELADA" },
  });
  expect(
    (await readMonthlyGoal(actor, { month: "2079-11" })).performance.orders
      .actual,
  ).toBe("0");
  expect(
    await db.monthlyGoalRevision.count({ where: { month: "2079-11" } }),
  ).toBe(0);
  vi.useRealTimers();
});
