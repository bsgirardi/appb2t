import { createRoot } from "react-dom/client";
import { FinanceDashboard } from "@/components/finance/finance-dashboard";
import { FinanceFilters } from "@/components/finance/filters";
import { CashFlow } from "@/components/finance/cash-flow";
import { EntryPanel } from "@/components/finance/entry-panel";
import { MovementPanel } from "@/components/finance/movement-panel";
import { TaxReportPanel } from "@/components/finance/tax-report";
import { TaxSettingsPanel } from "@/components/settings/tax-settings-panel";
import { AppShell } from "@/components/shell/app-shell";
import {
  readingAccount,
  readingEntry,
  readingReport,
} from "./fixtures/finance-reading";
import "@/app/design.css";

// Offline presentation fixture. No session, database or financial endpoint is used.
const params = new URLSearchParams(location.search);
const view = params.get("view") ?? "overview";
const state = params.get("state");
document.documentElement.dataset.theme = params.get("theme") ?? "light";
window.fetch = async () => {
  if (state === "pending") return new Promise<Response>(() => {});
  return new Response(
    JSON.stringify({
      error: {
        code: "NETWORK",
        message: "Falha sintética de consulta. Tente novamente.",
      },
    }),
    { status: 503 },
  );
};
const query = {
  dateFrom: "2026-11-01",
  dateTo: "2026-11-30",
  accountId: readingAccount.id,
  search: "Projeto sintético de personalização",
};
const empty = state === "empty" || state === "outside";
const page = {
  total: state === "outside" ? 40 : empty ? 0 : 1,
  page: state === "outside" ? 9 : 1,
  pageSize: 20,
};
const report =
  state === "empty"
    ? { ...readingReport, rows: [], partialSales: 0, uncoveredBase: "0.00" }
    : readingReport;
const day = {
  date: "2026-11-08",
  incoming: "999999999.99",
  outgoing: "30.00",
  transfersNet: "-20.00",
  adjustmentsNet: "0.00",
  closingBalance: null,
};
createRoot(document.getElementById("root")!).render(
  <AppShell
    actor={{
      id: "fixture",
      role: "ADMIN",
      name: "Prévia sintética",
      email: "fixture@example.test",
    }}
  >
    <p>
      Prévia sintética de interface. Valores fictícios; nenhuma operação é
      persistida.
    </p>
    {view === "tax" ? (
      <>
        <h1>Previsão tributária</h1>
        <TaxReportPanel
          report={report}
          memories={[]}
          memory={
            state === "memory"
              ? {
                  id: "memory",
                  actorName: "Pessoa sintética",
                  createdAt: report.readAt,
                  result: report,
                }
              : undefined
          }
        />
      </>
    ) : view === "settings" ? (
      <TaxSettingsPanel initial={{ profiles: [], version: 0 }} />
    ) : (
      <>
        <FinanceFilters
          action={
            view === "entries"
              ? "/financeiro/lancamentos"
              : view === "movements"
                ? "/financeiro/movimentos"
                : "/financeiro"
          }
          query={query}
          accounts={[readingAccount]}
          categories={[]}
          entries={view === "entries"}
        />
        {view === "entries" ? (
          <EntryPanel
            result={{ ...page, items: empty ? [] : [readingEntry] }}
            accounts={[readingAccount]}
            categories={[]}
            query={query}
          />
        ) : view === "movements" ? (
          <MovementPanel
            query={query}
            accounts={[readingAccount]}
            result={{
              ...page,
              totals: {
                incoming: "0.00",
                outgoing: "30.00",
                transfersNet: "-20.00",
                adjustmentsNet: "0.00",
                net: "-50.00",
              },
              items: empty
                ? []
                : [
                    {
                      id: "movement",
                      accountId: readingAccount.id,
                      categoryId: null,
                      amount: "-30.00",
                      effectiveDate: "2026-11-08",
                      kind: "PAYMENT",
                      description: readingEntry.description,
                      actorName: "Pessoa sintética",
                      settlementId: "settlement",
                      transferId: null,
                      reversalOfId: null,
                      createdAt: report.readAt,
                    },
                  ],
            }}
          />
        ) : (
          <>
            <FinanceDashboard
              today="2026-11-08"
              data={{
                balance: "999999999.99",
                receivablePending: "999999999.99",
                payablePending: "30.00",
                receivableOverdue: "0.00",
                payableOverdue: "30.00",
                realizedIn: "0.00",
                realizedOut: "30.00",
              }}
            />
            <CashFlow
              realized={empty ? [] : [day]}
              projected={
                empty
                  ? []
                  : [{ ...day, transfersNet: "0.00", closingBalance: "0.00" }]
              }
              overdueNet="-30.00"
            />
          </>
        )}
      </>
    )}
  </AppShell>,
);
