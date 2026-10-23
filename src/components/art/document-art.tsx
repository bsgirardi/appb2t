import type { DocumentItemInput } from "@/domain/commerce/types";
import type { DocumentArtDTO } from "@/domain/art/types";
import { TeamArtPanel } from "./team-panel";
export function DocumentArt({
  items,
  art,
}: {
  items: DocumentItemInput[];
  art?: DocumentArtDTO[];
}) {
  const ids = [
    ...new Set(
      items.flatMap((item) =>
        item.catalogOrigin ? [item.catalogOrigin.requestId] : [],
      ),
    ),
  ];
  if (!ids.length) return null;
  return (
    <section aria-label="Arte do documento">
      <h2>Arte e continuidade</h2>
      {art?.map((a) => (
        <p key={a.lineKey}>
          Linha {items.findIndex((i) => i.lineId === a.lineKey) + 1}:{" "}
          {a.applicable
            ? `arte aprovada, versão ${a.revisionNumber}`
            : "arte pendente ou desatualizada; produção bloqueada"}
        </p>
      ))}
      {ids.map((id) => (
        <TeamArtPanel
          key={id}
          requestId={id}
          lines={items
            .filter((i) => i.catalogOrigin?.requestId === id)
            .map((i) => ({
              lineId: i.catalogOrigin!.sourceLineId,
              name: i.description,
              quantity: i.quantity,
            }))
            .filter(
              (line, index, all) =>
                all.findIndex((l) => l.lineId === line.lineId) === index,
            )}
        />
      ))}
    </section>
  );
}
