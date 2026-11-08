import { Badge } from "@/components/ui/badge";

/** Server-applied criteria, independent of the mounted filter draft. */
export function OperationListContext({
  title,
  total,
  criteria,
}: {
  title: string;
  total: number;
  criteria: (string | false | undefined)[];
}) {
  const applied = criteria.filter(
    (criterion): criterion is string =>
      typeof criterion === "string" && !!criterion,
  );
  return (
    <section
      aria-label="Contexto dos resultados"
      className="operation-list-context"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2>{title}</h2>
        <p>{total} registros</p>
      </div>
      {applied.length ? (
        <ul aria-label="Filtros e contexto aplicados">
          {applied.map((criterion) => (
            <li key={criterion}>
              <Badge variant="outline">{criterion}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Sem filtros aplicados.</p>
      )}
    </section>
  );
}
