import { Badge } from "@/components/ui/badge";
import { commerceStatusLabel } from "./list-feedback";

/** Describes the query that produced the results, never the unsubmitted draft. */
export function AppliedListFilters({
  filters,
  customerName,
}: {
  filters: {
    search: string;
    status: string;
    customerId?: string;
    from?: string;
    to?: string;
  };
  customerName?: string;
}) {
  const criteria = [
    filters.search && `Busca: ${filters.search}`,
    filters.status &&
      filters.status !== "all" &&
      `Estado: ${filters.status === "realizadas" ? "Vendas efetivadas" : commerceStatusLabel(filters.status)}`,
    filters.customerId && `Cliente: ${customerName ?? "Cliente selecionado"}`,
    filters.from && `De: ${filters.from.split("-").reverse().join("/")}`,
    filters.to && `Até: ${filters.to.split("-").reverse().join("/")}`,
  ].filter(Boolean);
  return (
    <section
      aria-label="Filtros aplicados"
      className="commercial-applied-filters"
    >
      {criteria.length ? (
        <>
          <p>Filtros aplicados</p>
          <ul>
            {criteria.map((criterion) => (
              <li key={String(criterion)}>
                <Badge variant="outline">{criterion}</Badge>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Sem filtros aplicados.</p>
      )}
    </section>
  );
}
