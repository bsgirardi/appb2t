import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { availabilityLabels } from "@/domain/products/commercial";
import type { AdDraftDTO, AdSourceSnapshot } from "@/domain/advertising/types";
function Source({
  source,
  title,
}: {
  source: AdSourceSnapshot;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-2 break-words">
        <p>{source.name}</p>
        <p>{source.shortDescription || source.description}</p>
        <p className="whitespace-pre-wrap">{source.specifications}</p>
        <p>
          {availabilityLabels[source.availability]} ·{" "}
          {source.active
            ? "Publicado no catálogo"
            : "Não publicado no catálogo"}
        </p>
        <p>
          Mínimo: {source.minimumQuantity} · Prazo de produção:{" "}
          {source.leadTimeDays ? `${source.leadTimeDays} dias` : "a consultar"}
        </p>
        <p>
          Cores: {source.colors.join(", ") || "a consultar"} · Tamanhos:{" "}
          {source.sizes.join(", ") || "a consultar"}
        </p>
        <p>
          {source.personalizable
            ? "Personalização disponível"
            : "Sem opções de personalização cadastradas"}
        </p>
      </CardContent>
    </Card>
  );
}
export function AdSourceReview({ draft }: { draft: AdDraftDTO }) {
  return (
    <details>
      <summary>Conferir os dados da ficha do produto</summary>
      <div className="mt-3 grid min-w-0 gap-4 lg:grid-cols-2">
        <Source source={draft.source} title="Referência do rascunho" />
        <Source source={draft.currentSource} title="Ficha atual" />
      </div>
    </details>
  );
}
