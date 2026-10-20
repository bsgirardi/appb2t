import type { DocumentItemInput } from "@/domain/commerce/types";
export function CatalogOrigins({ items }: { items: DocumentItemInput[] }) {
  return (
    <>
      {items
        .filter((item) => item.catalogOrigin)
        .map((item) => {
          const origin = item.catalogOrigin!;
          const line = origin.snapshot;
          return (
            <details
              key={item.lineId ?? origin.sourceLineId}
              className="my-3 break-words"
            >
              <summary>Configuração recebida — {line.name}</summary>
              <p>
                Cor: {line.color || "Não informada"} · Tamanho:{" "}
                {line.size || "Não informado"}
              </p>
              <dl>
                {line.answerLabels.map((answer) => (
                  <div key={answer.fieldId}>
                    <dt>{answer.label}</dt>
                    <dd>{answer.valueLabel}</dd>
                  </div>
                ))}
              </dl>
              {line.included && <p>Incluído: {line.included}</p>}
              {line.leadTimeCondition && (
                <p>Condição de produção: {line.leadTimeCondition}</p>
              )}
            </details>
          );
        })}
    </>
  );
}
