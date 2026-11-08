import { Badge } from "@/components/ui/badge";
import { coverageNames } from "./format";

/** Only the query that produced the report, never the draft inside the form. */
export function ProfitabilityAppliedFilters({
  filters,
  period,
  products,
  channels,
}: {
  filters: Record<string, string>;
  period: { from: string; to: string };
  products: { id: string; name: string }[];
  channels: { id: string; name: string }[];
}) {
  const selected = (
    id: string | undefined,
    options: { id: string; name: string }[],
    missing: string,
  ) =>
    !id
      ? "Todos"
      : id === "__none__"
        ? missing
        : (options.find((o) => o.id === id)?.name ??
          "Referência selecionada indisponível");
  const criteria = [
    filters.undated === "true"
      ? "Sem data de confirmação: período não aplicado"
      : `Confirmação: ${filters.from ?? period.from} a ${filters.to ?? period.to} (São Paulo)`,
    `Situação: ${filters.situation === "EXCEPTIONS" ? "Canceladas / pendências" : "Vendas normais"}`,
    `Produto: ${selected(filters.productId, products, "Sem produto vinculado")}`,
    `Canal: ${selected(filters.channelId, channels, "Não informado")}`,
    `Cobertura realizada: ${coverageNames[filters.coverage as keyof typeof coverageNames] ?? "Todas"}`,
  ];
  return (
    <section
      aria-label="Critérios aplicados à rentabilidade"
      className="profitability-applied-filters"
    >
      <h2>Critérios aplicados ao relatório</h2>
      <ul>
        {criteria.map((criterion) => (
          <li key={criterion}>
            <Badge variant="outline">{criterion}</Badge>
          </li>
        ))}
      </ul>
      <p>
        Totais e rankings consideram todas as páginas. Recorrência e perdas têm
        períodos próprios.
      </p>
    </section>
  );
}
