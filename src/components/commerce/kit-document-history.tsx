import { formatBRL } from "@/domain/calculation/calculate";
import type { CatalogKitDocument } from "@/domain/kits/document";
import { KitReceivedPreview } from "@/components/kits/kit-received-preview";
export function KitDocumentHistory({ value }: { value: CatalogKitDocument }) {
  return (
    <section
      className="flex min-w-0 flex-col gap-3"
      aria-label="Histórico dos kits recebidos"
    >
      <h2>Kits recebidos</h2>
      <p>
        Este registro preserva a preparação original. Alterações no orçamento
        não recalculam automaticamente o desconto dos kits. Revise o desconto
        comercial atual antes de salvar.
      </p>
      <details>
        <summary className="min-h-11">
          Consultar cálculo registrado na preparação
        </summary>
        {value.preparation.groups.map((calculation) => (
          <p key={calculation.instanceId}>
            {value.groups.find((g) => g.instanceId === calculation.instanceId)
              ?.name ?? "Kit recebido"}
            : {calculation.quantity} unidades; soma{" "}
            {formatBRL(calculation.subtotal)}; desconto registrado{" "}
            {formatBRL(calculation.discount)}; referência líquida registrada{" "}
            {formatBRL(calculation.total)}.
          </p>
        ))}
        <p>
          Desconto adicional registrado na preparação:{" "}
          {formatBRL(value.preparation.additionalDiscount)}.
        </p>
      </details>
      <details>
        <summary className="min-h-11">
          Consultar montagem e personalizações recebidas
        </summary>
        {value.groups.map((group) => (
          <div key={group.instanceId}>
            <KitReceivedPreview
              group={group}
              lines={value.receivedLines ?? []}
            />
            {value.receivedLines
              ?.filter((line) => line.kitInstanceId === group.instanceId)
              .map((line) => (
                <div key={line.lineId}>
                  <strong>
                    {line.name} · {line.quantity} un.
                  </strong>
                  {line.answerLabels.map((answer) => (
                    <p className="preserve-lines" key={answer.fieldId}>
                      {answer.label}: {answer.valueLabel}
                    </p>
                  ))}
                </div>
              ))}
          </div>
        ))}
      </details>
    </section>
  );
}
