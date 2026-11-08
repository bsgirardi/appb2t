import { Badge } from "@/components/ui/badge";

/** Only applied server criteria belong here, never control drafts. */
export function RelationshipCriteria({ criteria }: { criteria: string[] }) {
  return (
    <section aria-label="Filtros aplicados" className="relationship-criteria">
      <p>{criteria.length ? "Filtros aplicados" : "Sem filtros aplicados."}</p>
      {criteria.length > 0 && (
        <ul>
          {criteria.map((criterion) => (
            <li key={criterion}>
              <Badge variant="outline">{criterion}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
