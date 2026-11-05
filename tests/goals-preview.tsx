import { createRoot } from "react-dom/client";
import { MonthlyGoals } from "@/components/profitability/monthly-goals";
import { aggregateSales } from "@/domain/profitability/aggregate";
import { calculateSale } from "@/domain/profitability/calculate";
import {
  monthPeriod,
  monthlyPerformance,
} from "@/domain/profitability/monthly-goals";
import { completeInput } from "./fixtures/profitability";
import { Button } from "@/components/ui/button";
import "@/app/design.css";
const values = { revenue: "1000.00", contribution: "300.00", orders: "10" };
const summary = aggregateSales([calculateSale(completeInput())]).summary;
const period = monthPeriod("2026-11", "2026-11-05");
const initial = {
  editorId: "preview-admin",
  month: "2026-11",
  version: 1,
  values,
  period,
  summary,
  performance: monthlyPerformance(summary, values, period),
  readAt: "2026-11-05T15:00:00Z",
  history: {
    page: 1,
    total: 1,
    items: [
      {
        version: 1,
        values,
        reason: "Planejamento demonstrativo, sem dados operacionais.",
        actorName: "Equipe fictícia",
        createdAt: "2026-11-05T14:00:00Z",
      },
    ],
  },
};
createRoot(document.getElementById("root")!).render(
  <main
    className="admin-ui admin-theme font-admin flex min-w-0 flex-col gap-4"
    style={{ padding: 16, maxWidth: 1100, margin: "auto" }}
  >
    <h1>Acompanhamento mensal — prévia</h1>
    <p>Dados fictícios. Sem acesso a banco ou API operacional.</p>
    <Button
      variant="outline"
      onClick={() => {
        document.documentElement.dataset.theme =
          document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      }}
    >
      Alternar tema
    </Button>
    <MonthlyGoals initial={initial} />
  </main>,
);
