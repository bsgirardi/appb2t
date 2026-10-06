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
    ["fullCost", "Custo completo do lote"],
    ["fees", "Taxas sobre a receita"],
  ];
  return (
    <section className="card space-y-4" aria-label="Resultado do lote">
      <h3>Resultado para {input.quantity} peças</h3>
      <dl className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["Custo completo por peça", result.unitFullCost],
            ["Preço sugerido por peça", result.offeredUnitPrice],
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
          {input.materials.map((m, i) => (
            <p key={i}>
              {m.name}: {m.consumptionPerUnit} {m.unit === "G" ? "g" : "ml"}
              /peça + {m.fixedWaste} de desperdício fixo;{" "}
              {formatBRL(m.pricePerBase)}/{m.unit === "G" ? "kg" : "litro"}.
            </p>
          ))}
        </dl>
      </details>
      <p className="muted">
        Estimativa antes das despesas fixas da empresa. Trabalho é tratado como
        custo da atividade; depreciação não é saída de caixa. A soma dos
        componentes exibidos pode variar em centavos por arredondamento.
      </p>
    </section>
  );
}
