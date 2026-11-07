import { createRoot } from "react-dom/client";
import { RecurrencePanel } from "@/components/profitability/recurrence-panel";
import { buildRecurrence } from "@/domain/profitability/recurrence";
import { calculateSale } from "@/domain/profitability/calculate";
import {
  recurrenceCandidate,
  recurrencePopulation,
  recurrencePeriod,
} from "./fixtures/recurrence";
import { Button } from "@/components/ui/button";
import "@/app/design.css";

const rows = recurrencePopulation();
const pending = recurrenceCandidate(6);
pending.line.actual.provisional = true;
pending.sale = calculateSale(pending.sale);
pending.line = pending.sale.lines[0];
rows.push(pending);
const incomplete = recurrenceCandidate(7);
incomplete.configuration = null;
rows.push(incomplete);
createRoot(document.getElementById("root")!).render(
  <main
    className="admin-ui admin-theme font-admin flex min-w-0 flex-col gap-4"
    style={{ padding: 16, maxWidth: 1200, margin: "auto" }}
  >
    <h1>E2.4 — prévia com dados fictícios</h1>
    <p>Sem conexão com banco ou API.</p>
    <Button
      variant="outline"
      onClick={() => {
        document.documentElement.dataset.theme =
          document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      }}
    >
      Alternar tema
    </Button>
    <RecurrencePanel value={buildRecurrence(rows, recurrencePeriod)} />
  </main>,
);
