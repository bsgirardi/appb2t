import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowUpRight, ChartNoAxesCombined, Info } from "lucide-react";
import { formatBRL } from "@/domain/calculation/calculate";
import type { CalculationResult } from "@/domain/calculation/types";
const rows: [keyof CalculationResult, string, string][] = [
  ["material", "Material", "#19806c"],
  ["energy", "Energia elétrica", "#b9a070"],
  ["machine", "Custo da máquina", "#7892b6"],
  ["maintenance", "Manutenção", "#b1bac6"],
  ["failure", "Provisão para falhas", "#caaca3"],
  ["finishing", "Acabamento", "#a0b7a3"],
  ["fixation", "Fixação", "#d2cec1"],
];
export function CostBreakdown({
  result,
  markup,
}: {
  result: CalculationResult | null;
  markup: string;
}) {
  return (
    <section className="result-column" aria-label="Resultado financeiro">
      <div className="price-card">
        <div className="price-top">
          <span>PREÇO SUGERIDO DE VENDA</span>
          <ArrowUpRight size={23} />
        </div>
        <div className="sale-price" aria-live="polite">
          {result ? formatBRL(result.sale) : "R$ —"}
        </div>
        <p>
          {result
            ? "Um preço que considera toda a sua produção."
            : "Preencha os dados para encontrar seu preço."}
        </p>
        <Separator className="my-4 bg-current opacity-25" />
        <div className="price-stats">
          <div>
            <span>Custo de produção</span>
            <strong>{result ? formatBRL(result.total) : "—"}</strong>
          </div>
          <div>
            <span>Lucro estimado</span>
            <strong>{result ? formatBRL(result.profit) : "—"}</strong>
          </div>
        </div>
        <div className="markup-badge">
          <ChartNoAxesCombined size={14} />
          {markup}% de acréscimo sobre o custo
        </div>
      </div>
      <Card asChild>
        <div className="breakdown">
          <div className="section-heading">
            <h2>Composição do custo</h2>
            <span className="tag">DETALHADO</span>
          </div>
          <div className="cost-bar" aria-hidden="true">
            {rows.map(([key, , color]) => (
              <span
                key={key}
                style={{
                  background: color,
                  flex:
                    result && Number(result.total) > 0
                      ? Number(result[key]) / Number(result.total)
                      : 1,
                }}
              />
            ))}
          </div>
          <dl>
            {rows.map(([key, label, color]) => (
              <div className="cost-row" key={key}>
                <dt>
                  <span className="cost-dot" style={{ background: color }} />
                  {label}
                </dt>
                <dd>{result ? formatBRL(result[key]) : "—"}</dd>
              </div>
            ))}
            <div className="cost-total">
              <dt>Custo total</dt>
              <dd>{result ? formatBRL(result.total) : "—"}</dd>
            </div>
          </dl>
          <div className="rounding-note">
            <Info size={14} />
            <p>
              Os valores são arredondados apenas na exibição. A soma das
              parcelas pode variar em um centavo.
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
