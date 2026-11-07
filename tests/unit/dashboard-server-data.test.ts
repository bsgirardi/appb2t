import { beforeEach, expect, it, vi } from "vitest";
import Decimal from "decimal.js";
const mocks = vi.hoisted(() => ({
  tx: {
    sale: { findMany: vi.fn() },
    quote: { findMany: vi.fn() },
    opportunity: { findMany: vi.fn() },
    catalogRequest: { findMany: vi.fn() },
    artLineRequirement: { findMany: vi.fn() },
    productionOrder: { findMany: vi.fn() },
    productionEvent: { findMany: vi.fn() },
    printer: { findMany: vi.fn() },
    planningCalendar: { findMany: vi.fn() },
    planningBatch: { findMany: vi.fn() },
    stockItem: { findMany: vi.fn() },
    stockMovement: { groupBy: vi.fn(), findMany: vi.fn() },
    stockReservationEvent: { findMany: vi.fn() },
    planningParticipation: { findMany: vi.fn() },
    productionLine: { count: vi.fn(), findMany: vi.fn() },
    financialAccount: { findMany: vi.fn() },
    cashMovement: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
  balance: vi.fn(),
  sources: vi.fn(),
  admin: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: (fn: (tx: unknown) => unknown) => fn(mocks.tx),
    productionOrder: mocks.tx.productionOrder,
  },
}));
vi.mock("@/server/finance/accounts", () => ({
  getAccountBalance: mocks.balance,
}));
vi.mock("@/server/profitability/sources", () => ({
  readSaleSources: mocks.sources,
}));
vi.mock("@/server/profitability/authorization", () => ({
  requireProfitabilityAdmin: mocks.admin,
}));
import { getCommercialDashboard } from "@/server/dashboard/commercial";
import { getProductionDashboard } from "@/server/dashboard/production";
import { getStockDashboard } from "@/server/dashboard/stock";
import { getFinancialDashboard } from "@/server/dashboard/finance";
import { getProfitabilityDashboard } from "@/server/dashboard/profitability";
import { getOverviewDashboard } from "@/server/dashboard/overview";
import { resolveDashboardFilter } from "@/domain/dashboard/filters";
const actor = {
  id: "u",
  name: "Equipe",
  email: "u@test.com",
  role: "ADMIN" as const,
};
const f = resolveDashboardFilter({}, actor.role, new Date("2026-10-26T15:00Z"));
beforeEach(() => {
  vi.clearAllMocks();
  for (const model of Object.values(mocks.tx))
    if (typeof model === "function") model.mockResolvedValue([]);
    else for (const fn of Object.values(model)) fn.mockResolvedValue([]);
  mocks.tx.productionLine.count.mockResolvedValue(0);
  mocks.sources.mockResolvedValue([]);
});
it("all operational queries produce serializable honest empty dashboards", async () => {
  for (const read of [
    getCommercialDashboard,
    getProductionDashboard,
    getStockDashboard,
    getFinancialDashboard,
    getProfitabilityDashboard,
  ]) {
    const panel = await read(actor, f);
    expect(panel.metrics.length).toBeGreaterThan(0);
    expect(() => JSON.stringify(panel)).not.toThrow();
  }
});
it("nets reversal receipts and keeps unknown opening balance unavailable", async () => {
  mocks.tx.financialAccount.findMany.mockResolvedValue([
    { id: "a", name: "Banco" },
  ]);
  mocks.balance.mockResolvedValue(null);
  mocks.tx.cashMovement.findMany.mockResolvedValue([
    {
      amount: new Decimal(100),
      kind: "RECEIPT",
      effectiveDate: new Date("2026-10-10"),
      reversalOf: null,
    },
    {
      amount: new Decimal(-100),
      kind: "REVERSAL",
      effectiveDate: new Date("2026-10-12"),
      reversalOf: { kind: "RECEIPT" },
    },
  ]);
  const data = await getFinancialDashboard(actor, f);
  expect(data.metrics.find((m) => m.id === "incoming")?.value).toBe("0.00");
  expect(data.metrics.find((m) => m.id === "balance")?.value).toBeNull();
  expect(
    data.charts
      .find((c) => c.id === "projection")
      ?.points.every((p) => p.value === null),
  ).toBe(true);
});
it("product drilldowns point to a real administrative route", async () => {
  mocks.tx.sale.findMany.mockResolvedValue([
    {
      id: "s",
      sequence: 1,
      customerId: "c",
      status: "CONFIRMADA",
      createdAt: new Date("2026-10-10T12:00Z"),
      expectedDeliveryDate: null,
      totals: { total: "10" },
      items: [
        {
          productId: "p",
          description: "Produto",
          quantity: 1,
          unitPrice: new Decimal(10),
        },
      ],
    },
  ]);
  const data = await getCommercialDashboard(actor, f);
  expect(data.tables[0].rows[0].href).toBe("/produtos");
  expect(data.metrics.find((m) => m.id === "ready")?.value).toBe("0");
  expect(data.charts.find((c) => c.id === "saleStatus")?.points).toEqual([
    { label: "CONFIRMADA", value: "1" },
  ]);
});
it("flags the unprogrammed remainder after a partially completed closed lot", async () => {
  mocks.tx.productionLine.findMany.mockResolvedValue([
    {
      targetUnits: 10,
      events: [{ goodUnits: 5, canceledUnits: 0 }],
      planningParticipations: [
        {
          units: 5,
          settledUnits: 5,
          releasedUnits: 0,
          batch: { state: "CLOSED" },
        },
      ],
    },
  ]);
  const data = await getStockDashboard(actor, f);
  expect(data.metrics.find((m) => m.id === "undeclared")?.value).toBe("1");
});
it("production includes sales due soon even without production orders", async () => {
  mocks.tx.sale.findMany.mockResolvedValue([
    {
      id: "sale",
      sequence: 10,
      status: "CONFIRMADA",
      fulfillmentMode: "U3",
      expectedDeliveryDate: new Date("2026-10-27"),
      items: [],
      productionDeliveries: [],
    },
  ]);
  const data = await getProductionDashboard(actor, f);
  expect(data.priorities.some((p) => p.href === "/vendas/sale")).toBe(true);
});
it("overview keeps ready sales visible and never loads finances for an operator", async () => {
  const data = await getOverviewDashboard({ ...actor, role: "OPERATOR" }, f);
  expect(data.metrics.find((m) => m.id === "ready")?.value).toBe("0");
  expect(mocks.tx.financialAccount.findMany).not.toHaveBeenCalled();
});

it("commercial merges overdue contact and principal expiry for both roles without finance queries", async () => {
  mocks.tx.opportunity.findMany.mockResolvedValue([
    {
      id: "o",
      title: "Negociação teste",
      stage: "PROPOSTA",
      principalQuoteId: "q",
      nextContactDate: new Date("2026-10-25"),
      nextAction: "Telefonar",
      owner: { name: "Ana" },
    },
  ]);
  mocks.tx.quote.findMany.mockResolvedValue([
    {
      id: "q",
      sequence: 12,
      status: "ENVIADO",
      createdAt: new Date("2026-10-01"),
      validUntil: new Date("2026-10-27"),
      totals: { total: "10" },
      events: [],
      sale: null,
      opportunityId: "o",
    },
  ]);
  for (const role of ["ADMIN", "OPERATOR"] as const) {
    const panel = await getCommercialDashboard({ ...actor, role }, f);
    expect(panel.priorities).toHaveLength(1);
    expect(panel.priorities[0]).toMatchObject({
      href: "/negociacoes/o",
      severity: "urgent",
    });
    expect(panel.priorities[0].detail).toContain("Ana");
    expect(panel.metrics.find((m) => m.id === "overdueContacts")?.value).toBe(
      "1",
    );
  }
  expect(mocks.tx.financialAccount.findMany).not.toHaveBeenCalled();
});
it("commercial coverage identifies missing source dates instead of all clear", async () => {
  mocks.tx.opportunity.findMany.mockResolvedValue([
    {
      id: "o",
      title: "Sem data",
      stage: "PROPOSTA",
      principalQuoteId: null,
      nextContactDate: null,
      nextAction: null,
      owner: { name: "Ana" },
    },
  ]);
  const panel = await getCommercialDashboard(actor, f);
  expect(panel.priorityContext).toContain("1 negociação(ões) sem data");
  expect(panel.priorityContext).toContain("não comprova");
});
