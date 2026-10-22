import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  sale: { findMany: vi.fn(), count: vi.fn() },
  quote: { count: vi.fn() },
  productionOrder: { count: vi.fn() },
  finance: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: { $transaction: (fn: (tx: unknown) => unknown) => fn(mocks) },
}));
vi.mock("@/server/finance/reports", () => ({
  getFinanceDashboard: mocks.finance,
}));
import { getDashboard } from "@/server/dashboard";
const actor = {
  id: "u",
  name: "Equipe",
  email: "u@example.com",
  role: "OPERATOR" as const,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.sale.findMany.mockResolvedValue([
    { totals: { total: "0.10" } },
    { totals: { total: "0.20" } },
  ]);
  mocks.sale.count.mockResolvedValue(3);
  mocks.quote.count.mockResolvedValue(4);
  mocks.productionOrder.count.mockResolvedValue(2);
  mocks.finance.mockResolvedValue({ balance: "100.00" });
});
it("sums monthly sales precisely and excludes drafts and cancellations", async () => {
  const result = await getDashboard(actor, new Date("2026-11-01T01:00:00Z"));
  expect(result.month).toBe("2026-10");
  expect(result.salesValue).toBe("0.30");
  expect(mocks.sale.findMany.mock.calls[0][0].where).toEqual({
    status: { notIn: ["RASCUNHO", "CANCELADA"] },
    createdAt: {
      gte: new Date("2026-10-01T00:00:00-03:00"),
      lt: new Date("2026-11-01T00:00:00-03:00"),
    },
  });
  expect(mocks.quote.count.mock.calls[0][0].where.OR).toContainEqual({
    status: { in: ["ENVIADO", "APROVADO"] },
    validUntil: { gte: new Date("2026-10-31T00:00:00Z") },
  });
});
it("does not read financial data for operators", async () => {
  expect((await getDashboard(actor)).finance).toBeNull();
  expect(mocks.finance).not.toHaveBeenCalled();
});
it("uses the existing financial report for administrators", async () => {
  expect((await getDashboard({ ...actor, role: "ADMIN" })).finance).toEqual({
    balance: "100.00",
  });
  expect(mocks.finance).toHaveBeenCalledOnce();
});
