import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import type {
  DashboardFilter,
  DashboardPanelDTO,
} from "@/domain/dashboard/types";
import { getOverviewDashboard } from "./overview";
import { getCommercialDashboard } from "./commercial";
import { getProductionDashboard } from "./production";
import { getStockDashboard } from "./stock";
import { getFinancialDashboard } from "./finance";
import { getProfitabilityDashboard } from "./profitability";
export async function getDashboardPanel(
  actor: Actor,
  filter: DashboardFilter,
): Promise<DashboardPanelDTO> {
  if (["finance", "profitability"].includes(filter.panel)) assertAdmin(actor);
  switch (filter.panel) {
    case "overview":
      return getOverviewDashboard(actor, filter);
    case "commercial":
      return getCommercialDashboard(actor, filter);
    case "production":
      return getProductionDashboard(actor, filter);
    case "stock":
      return getStockDashboard(actor, filter);
    case "finance":
      return getFinancialDashboard(actor, filter);
    case "profitability":
      return getProfitabilityDashboard(actor, filter);
  }
}
