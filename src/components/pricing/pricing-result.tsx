import { formatBRL } from "@/domain/calculation/calculate";
import type { PricingV2Input, PricingV2Result } from "@/domain/pricing/types";
import { Notice } from "@/components/ui/field";
export function PricingResult({
  input,
  result,
}: {
  input: PricingV2Input;
  result: PricingV2Result;
}) {
  const rows: [keyof PricingV2Result, string][] = [
    ["material", "Materiais"],
    ["energy", "Energia"],
    ["maintenance", "Manutenção"],
    ["failure", "Reserva para falhas"],
    ["labor", "Trabalho"],
    ["extras", "Complementos"],
    ["commercialFixed", "Despesa comercial fixa"],
    ["depreciation", "Depreciação"],
    ["variableCost", "Base variável estimada"],
    ["fullCost", "Custo completo do lote"],
    ["theoreticalRevenue", "Receita teórica antes do arredondamento"],
    ["fees", "Taxas sobre a receita"],
  ];
  const decimal = (value: string) => value.replace(".", ",");
  const mode = {
    MARKUP: "Markup sobre custo completo",
    CONTRIBUTION: "Margem de contribuição alvo",
    INFORMED: "Preço informado",
  }[input.mode];
  return (
    <section className="card space-y-4" aria-label="Resultado do lote">
      <h3>
        Resultado para {input.quantity}{" "}
        {input.quantity === 1 ? "peça" : "peças"}
      </h3>
      <dl className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["Custo completo por peça", result.unitFullCost],
            [
              input.mode === "INFORMED"
                ? "Preço informado por peça"
                : "Preço sugerido por peça",
              result.offeredUnitPrice,
            ],
            ["Receita do lote", result.offeredRevenue],
            ["Contribuição estimada", result.contribution],
            ["Resultado após depreciação", result.afterDepreciation],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="muted">{label}</dt>
            <dd className="text-xl font-semibold">{formatBRL(value)}</dd>
          </div>
        ))}
        <div>
          <dt>Margem de contribuição</dt>
          <dd>
            {result.contributionMargin === null
              ? "Não aplicável"
              : `${Number(result.contributionMargin).toFixed(2).replace(".", ",")}%`}
          </dd>
        </div>
      </dl>
      {result.warnings.includes("BELOW_FULL_COST") && (
        <Notice kind="info">
          O preço não cobre o custo completo modelado. Revise sua decisão
          comercial.
        </Notice>
      )}
      {result.warnings.includes("ROUNDED_TARGET") && (
        <p className="muted">
          A margem efetiva considera o arredondamento do preço por peça.
        </p>
      )}
      <details>
        <summary>Memória de cálculo</summary>
        <dl>
          {rows.map(([key, label]) => (
            <div className="flex justify-between gap-4 py-1" key={key}>
              <dt>{label}</dt>
              <dd>{formatBRL(result[key] as string)}</dd>
            </div>
          ))}
        </dl>
        <h4>Premissas preservadas</h4>
        <dl className="grid gap-3 sm:grid-cols-2">
          {(
            [
              [
                "Tecnologia",
                input.technology === "FDM" ? "Filamento FDM" : "Resina",
              ],
              ["Quantidade do lote", String(input.quantity)],
              [
                "Impressora",
                `${input.printer.name} · versão ${input.printer.ref.version}`,
              ],
              [
                "Aquisição da máquina",
                `R$ ${decimal(input.printer.acquisitionCost)}`,
              ],
              ["Amortização", `${input.printer.amortizationMonths} meses`],
              [
                "Capacidade de uso",
                `${input.printer.daysPerMonth} dias/mês × ${decimal(input.printer.hoursPerDay)} h/dia`,
              ],
              ["Potência", `${decimal(input.printer.watts)} W`],
              [
                "Tempo fixo de máquina",
                `${decimal(input.machineFixedMinutes)} min/lote`,
              ],
              [
                "Tempo equivalente de máquina",
                `${decimal(input.machineMinutesPerUnit)} min/peça`,
              ],
              [
                "Tarifa de energia preservada",
                `R$ ${decimal(input.energyRate)}/kWh`,
              ],
              [
                "Manutenção preservada",
                `R$ ${decimal(input.maintenancePerHour)}/hora`,
              ],
              [
                "Reserva de falhas preservada",
                `${decimal(input.failurePercent)}%`,
              ],
              ["Preparação", `${decimal(input.setupMinutes)} min/lote`],
              [
                "Acabamento",
                `${decimal(input.finishingMinutesPerUnit)} min/peça`,
              ],
              [
                "Tarifa de trabalho preservada",
                `R$ ${decimal(input.laborPerHour)}/hora`,
              ],
              [
                "Canal preservado",
                `${input.channel.name} · versão ${input.channel.ref.version}`,
              ],
              [
                "Despesa fixa do canal",
                `R$ ${decimal(input.channel.fixedCost)}/lote`,
              ],
              ["Modalidade preservada", mode],
              ["Markup configurado", `${decimal(input.markupPercent)}%`],
              [
                "Margem alvo configurada",
                `${decimal(input.targetMarginPercent)}%`,
              ],
              [
                "Preço informado na ficha",
                `R$ ${decimal(input.informedUnitPrice)}/peça`,
              ],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="muted">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <h4>Materiais preservados</h4>
        <ul>
          {input.materials.map((m, i) => (
            <li key={i}>
              {m.name} · versão {m.ref.version}: {decimal(m.consumptionPerUnit)}{" "}
              {m.unit === "G" ? "g" : "ml"}/peça + {decimal(m.fixedWaste)}{" "}
              {m.unit === "G" ? "g" : "ml"} de desperdício fixo; R${" "}
              {decimal(m.pricePerBase)}/{m.unit === "G" ? "kg" : "litro"}.
            </li>
          ))}
        </ul>
        <h4>Complementos preservados</h4>
        {input.extras.length ? (
          <ul>
            {input.extras.map((e, i) => (
              <li key={i}>
                {e.name} · versão {e.ref.version}: {decimal(e.quantity)}{" "}
                {e.basis === "UNIT" ? "por peça" : "por lote"} × R${" "}
                {decimal(e.unitCost)}.
              </li>
            ))}
          </ul>
        ) : (
          <p>Sem complementos.</p>
        )}
        <h4>Taxas preservadas</h4>
        {input.channel.fees.length ? (
          <ul>
            {input.channel.fees.map((fee, i) => (
              <li key={i}>
                {fee.label}: {decimal(fee.percent)}% sobre a receita.
              </li>
            ))}
          </ul>
        ) : (
          <p>Canal sem taxas percentuais.</p>
        )}
      </details>
      <p className="muted">
        Estimativa antes das despesas fixas da empresa. Trabalho é tratado como
        custo da atividade; depreciação não é saída de caixa. A soma dos
        componentes exibidos pode variar em centavos por arredondamento.
      </p>
    </section>
  );
}
