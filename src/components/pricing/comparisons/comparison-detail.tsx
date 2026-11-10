import Link from "next/link";
import type { SavedComparison } from "@/domain/pricing/comparisons/types";
import type { PricingCatalogDTO } from "@/domain/pricing/types";
import { ComparisonResults } from "./comparison-results";
import { ComparisonReuse } from "./comparison-reuse";
export function ComparisonDetail({
  comparison,
  catalog,
}: {
  comparison: SavedComparison;
  catalog: PricingCatalogDTO;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <h1>{comparison.name}</h1>
      <p>
        {comparison.actorName} ·{" "}
        {new Date(comparison.createdAt).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        })}
      </p>
      <Link href="/calculadora/cenarios">Voltar às comparações</Link>
      <p>
        Memória histórica imutável. Base:{" "}
        {comparison.reference.kind === "COMMON"
          ? `preço comum de R$ ${comparison.reference.unitPrice.replace(".", ",")} por peça`
          : `preço calculado por canal no modo ${comparison.originalMode}`}
        . Versão de cálculo {comparison.calculationVersion}.
      </p>
      {comparison.alternatives.map((item, i) => (
        <section key={item.id} className="flex min-w-0 flex-col gap-4">
          <ComparisonResults value={item} index={i} />
          <details>
            <summary>Premissas históricas da oferta {i + 1}</summary>
            <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
              {[
                ["Tecnologia", item.input.technology],
                ["Quantidade", item.input.quantity],
                ["Impressora", item.input.printer.name],
                ["Minutos fixos de máquina", item.input.machineFixedMinutes],
                ["Minutos por peça", item.input.machineMinutesPerUnit],
                ["Preparação (min)", item.input.setupMinutes],
                [
                  "Acabamento por peça (min)",
                  item.input.finishingMinutesPerUnit,
                ],
                ["Energia (R$/kWh)", item.input.energyRate],
                ["Trabalho (R$/h)", item.input.laborPerHour],
                [
                  item.input.maintenanceMode === "FIXED_PER_LOT"
                    ? "Manutenção fixa (R$/lote)"
                    : "Manutenção (R$/h)",
                  item.input.maintenanceMode === "FIXED_PER_LOT"
                    ? (item.input.maintenanceFixedPerLot ?? "0")
                    : item.input.maintenancePerHour,
                ],
                ["Falhas (%)", item.input.failurePercent],
                ["Markup (%)", item.input.markupPercent],
                ["Potência (W)", item.input.printer.watts],
                ["Aquisição (R$)", item.input.printer.acquisitionCost],
                ["Amortização (meses)", item.input.printer.amortizationMonths],
                ["Dias/mês", item.input.printer.daysPerMonth],
                ["Horas/dia", item.input.printer.hoursPerDay],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <ul>
              {item.input.materials.map((m, j) => (
                <li className="break-words" key={j}>
                  {m.name}: {m.pricePerBase} R$/kg ou litro; consumo{" "}
                  {m.consumptionPerUnit} {m.unit}/peça; desperdício fixo{" "}
                  {m.fixedWaste} {m.unit}; versão {m.ref.version}.
                </li>
              ))}
            </ul>
            <ul>
              {item.input.extras.map((e, j) => (
                <li className="break-words" key={j}>
                  {e.name}: {e.quantity} × R$ {e.unitCost},{" "}
                  {e.basis === "LOT" ? "por lote" : "por peça"}; versão{" "}
                  {e.ref.version}.
                </li>
              ))}
            </ul>
          </details>
          <ComparisonReuse input={item.input} catalog={catalog} />
        </section>
      ))}
      <p className="muted">
        Contribuição é anterior à depreciação; cobertura inclui apenas os custos
        modelados. Meta de contribuição e cobertura são condições independentes.
        Comparar memórias não altera preços publicados.
      </p>
    </section>
  );
}
