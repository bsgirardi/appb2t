import { createRoot } from "react-dom/client";
import { IntelligencePanel } from "@/components/profitability/intelligence-panel";
import { calculateSale } from "@/domain/profitability/calculate";
import { aggregateSales } from "@/domain/profitability/aggregate";
import { buildRankings } from "@/domain/profitability/intelligence";
import { completeInput, profitabilityInput } from "./fixtures/profitability";
import { Button } from "@/components/ui/button";
import "@/app/design.css";

const rows = [
  calculateSale(completeInput()),
  calculateSale({
    ...profitabilityInput(),
    saleId: "demo-2",
    number: "2",
    lines: profitabilityInput().lines.map((l) => ({
      ...l,
      productId: "other",
      description: "Personalizado sem custo completo",
    })),
  }),
];
createRoot(document.getElementById("root")!).render(
  <main
    className="admin-ui admin-theme font-admin flex min-w-0 flex-col gap-4"
    style={{ padding: 16, maxWidth: 1100, margin: "auto" }}
  >
    <h1>Rentabilidade — prévia demonstrativa</h1>
    <p>
      Dados fictícios para validação visual. Nenhuma conexão com banco ou API.
    </p>
    <Button
      variant="outline"
      onClick={() => {
        document.documentElement.dataset.theme =
          document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      }}
    >
      Alternar tema
    </Button>
    <IntelligencePanel
      summary={aggregateSales(rows).summary}
      rankings={buildRankings(rows, {
        sale: { id: "c", name: "Cliente demonstrativo" },
        "demo-2": { id: "d", name: "Outro cliente" },
      })}
      period={{
        from: "2026-10-01",
        to: "2026-10-10",
        today: "2026-11-04",
        enabled: true,
      }}
    />
  </main>,
);
