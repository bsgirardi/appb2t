import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  overview: vi.fn(),
  commercial: vi.fn(),
  production: vi.fn(),
  stock: vi.fn(),
  finance: vi.fn(),
  profitability: vi.fn(),
}));
vi.mock("@/server/dashboard/overview", () => ({
  getOverviewDashboard: mocks.overview,
}));
vi.mock("@/server/dashboard/commercial", () => ({
  getCommercialDashboard: mocks.commercial,
}));
vi.mock("@/server/dashboard/production", () => ({
  getProductionDashboard: mocks.production,
}));
vi.mock("@/server/dashboard/stock", () => ({ getStockDashboard: mocks.stock }));
vi.mock("@/server/dashboard/finance", () => ({
  getFinancialDashboard: mocks.finance,
}));
vi.mock("@/server/dashboard/profitability", () => ({
  getProfitabilityDashboard: mocks.profitability,
}));
import { getDashboardPanel } from "@/server/dashboard/panels";
import { resolveDashboardFilter } from "@/domain/dashboard/filters";
it("loads only the selected operation and rejects forged protected filters", async () => {
  const actor = {
    id: "u",
    name: "Equipe",
    email: "u@test.com",
    role: "OPERATOR" as const,
  };
  const f = resolveDashboardFilter({ panel: "stock" }, actor.role);
  await getDashboardPanel(actor, f);
  expect(mocks.stock).toHaveBeenCalledOnce();
  expect(mocks.commercial).not.toHaveBeenCalled();
  await expect(
    getDashboardPanel(actor, { ...f, panel: "finance" }),
  ).rejects.toThrow();
  expect(mocks.finance).not.toHaveBeenCalled();
});
