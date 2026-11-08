import { createRoot } from "react-dom/client";
import { ProfitabilityReport } from "@/components/profitability/report";
import { ProfitabilityDetail } from "@/components/profitability/detail";
import { ProductiveCostReconciliation } from "@/components/profitability/productive-reconciliation";
import { ProfitabilityAppliedFilters } from "@/components/profitability/applied-filters";
import { IntelligencePanel } from "@/components/profitability/intelligence-panel";
import { MonthlyGoals } from "@/components/profitability/monthly-goals";
import { RecurrencePanel } from "@/components/profitability/recurrence-panel";
import { calculateSale } from "@/domain/profitability/calculate";
import { aggregateSales } from "@/domain/profitability/aggregate";
import { buildRankings } from "@/domain/profitability/intelligence";
import { buildRecurrence } from "@/domain/profitability/recurrence";
import {
  monthPeriod,
  monthlyPerformance,
  emptyGoals,
} from "@/domain/profitability/monthly-goals";
import { recurrencePopulation, recurrencePeriod } from "./fixtures/recurrence";
import { completeInput, profitabilityInput } from "./fixtures/profitability";
import "@/app/design.css";

const query = new URLSearchParams(location.search);
document.documentElement.dataset.theme = query.get("theme") ?? "light";
// This preview never submits or reads operational APIs.
window.fetch = async () => {
  throw new Error("Prévia isolada: nenhuma gravação foi realizada.");
};
const input = completeInput();
input.lines[0].description =
  "Produto personalizado demonstrativo com descrição extensa e referência sem espaços ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
if (query.get("state") === "large") {
  input.totals = {
    subtotal: "999999999.99",
    discount: "0",
    shipping: "0",
    total: "999999999.99",
  };
  input.lines[0].grossRevenue = "999999999.99";
}
const sale = calculateSale(input);
if (query.get("state") === "negative") {
  sale.actual.contribution.value = "-999999999.99";
  sale.actual.afterDepreciation.value = "-999999999.99";
}
const rows =
  query.get("state") === "empty"
    ? []
    : [
        sale,
        calculateSale({
          ...profitabilityInput(),
          saleId: "missing",
          number: "2",
        }),
      ];
const result = aggregateSales(rows);
const period = monthPeriod("2026-11", "2026-11-08");
const values =
  query.get("state") === "empty"
    ? emptyGoals
    : { revenue: "1000.00", contribution: "0.00", orders: null };
const view = query.get("view") ?? "report";
createRoot(document.getElementById("root")!).render(
  <main
    className="admin-ui admin-theme font-admin profitability-reading flex min-w-0 flex-col gap-4"
    style={{ padding: 16, maxWidth: 1200, margin: "auto" }}
  >
    <h1>Rentabilidade — prévia sintética</h1>
    <p>Sem sessão, banco ou operação real. Gravações bloqueadas.</p>
    {view === "report" && (
      <>
        <ProfitabilityAppliedFilters
          filters={{}}
          period={{ from: "2026-11-01", to: "2026-11-08" }}
          products={[]}
          channels={[]}
        />
        <ProfitabilityReport
          result={
            query.get("state") === "outside"
              ? { ...result, items: [], page: 2 }
              : result
          }
        />
      </>
    )}
    {view === "detail" && <ProfitabilityDetail value={sale} />}
    {view === "productive" && (
      <ProductiveCostReconciliation
        line={sale.lines[0]}
        administrative={sale.administrative}
      />
    )}
    {view === "intelligence" && (
      <IntelligencePanel
        summary={result.summary}
        rankings={buildRankings(rows, {})}
        period={{
          from: "2026-11-01",
          to: "2026-11-08",
          today: "2026-11-08",
          enabled: true,
        }}
      />
    )}
    {view === "recurrence" && (
      <RecurrencePanel
        value={buildRecurrence(
          query.get("state") === "empty" ? [] : recurrencePopulation(),
          recurrencePeriod,
        )}
      />
    )}
    {view === "goals" && (
      <MonthlyGoals
        initial={{
          editorId: "synthetic",
          month: "2026-11",
          version: 0,
          values,
          period,
          summary: result.summary,
          performance: monthlyPerformance(result.summary, values, period),
          readAt: "2026-11-08T15:00:00Z",
          history: { page: 1, total: 0, items: [] },
        }}
      />
    )}
  </main>,
);
