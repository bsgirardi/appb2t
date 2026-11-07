"use client";
import { useState } from "react";
import Decimal from "decimal.js";
import type { PricingV2Input } from "@/domain/pricing/types";
import { calculateScenarios } from "@/domain/pricing/scenarios";
import { formatBRL } from "@/domain/calculation/calculate";
import { Field, FieldGroup, Notice } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

const modes = {
  MARKUP: "Markup",
  CONTRIBUTION: "Margem de contribuição",
  INFORMED: "Preço informado",
};
function decimal(value: string) {
  return new Decimal(value).toDecimalPlaces(2).toFixed().replace(".", ",");
}
export function PricingScenarios({
  input,
  onSelect,
}: {
  input: PricingV2Input;
  onSelect: (quantity: number) => void;
}) {
  const [text, setText] = useState("");
  let rows: ReturnType<typeof calculateScenarios> = [],
    error = "";
  if (text.trim())
    try {
      const parts = text.split(/[,;\s]+/).filter(Boolean);
      if (parts.some((p) => !/^\d+$/.test(p))) throw new Error();
      rows = calculateScenarios(input, parts.map(Number));
    } catch {
      error =
        "Informe até 10 quantidades inteiras de 1 a 100.000, separadas por vírgula. Revise também os limites de tempo e consumo de cada lote.";
    }
  return (
    <details>
      <summary>Comparar quantidades</summary>
      <FieldGroup className="mt-4">
        <Field
          label="Quantidades para comparar"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="1, 10, 20"
          error={error || undefined}
        />
        <p className="muted">
          Tempos fixos, desperdício e preparação são mantidos uma vez por lote.
          Revise a ocupação da máquina antes de aplicar.
        </p>
        {rows.length > 0 && (
          <>
            <p className="muted break-words">
              Canal: {input.channel.name} · Modalidade: {modes[input.mode]}.
              {input.mode === "CONTRIBUTION" && (
                <>
                  {" "}
                  Meta de margem de contribuição:{" "}
                  {decimal(input.targetMarginPercent)}%.
                </>
              )}
            </p>
            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              {rows.map((r, i) => (
                <Card asChild key={i}>
                  <article aria-label={`${r.quantity} peças`}>
                    <CardHeader>
                      <CardTitle>
                        <h3>{r.quantity} peças</h3>
                      </CardTitle>
                      <CardDescription>
                        Resultado estimado deste lote
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      {r.result.tax && (
                        <p className="text-sm text-muted-foreground">
                          {r.result.tax.amount === null
                            ? "Cobertura fiscal indisponível: resultados antes de tributos não identificados."
                            : input.tax?.profile?.regime === "MEI"
                              ? "DAS fixo mensal fora do lote; sem rateio por peça."
                              : `Tributo gerencial estimado: ${formatBRL(r.result.tax.amount)}, já incluído no resultado.`}
                        </p>
                      )}
                      <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
                        {(
                          [
                            [
                              "Custo completo por peça",
                              formatBRL(r.result.unitFullCost),
                            ],
                            [
                              "Preço oferecido por peça",
                              formatBRL(r.result.offeredUnitPrice),
                            ],
                            [
                              "Receita do lote",
                              formatBRL(r.result.offeredRevenue),
                            ],
                            [
                              "Contribuição estimada",
                              formatBRL(r.result.contribution),
                            ],
                            [
                              "Resultado após depreciação",
                              formatBRL(r.result.afterDepreciation),
                            ],
                            [
                              "Margem de contribuição",
                              r.result.contributionMargin === null
                                ? "Não aplicável"
                                : `${new Decimal(r.result.contributionMargin).toFixed(2).replace(".", ",")}%`,
                            ],
                            [
                              "Tempo de máquina",
                              `${decimal(r.machineMinutes)} min`,
                            ],
                            [
                              "Contribuição por hora de máquina",
                              `${formatBRL(r.contributionPerMachineHour)}/h`,
                            ],
                          ] as const
                        ).map(([label, value]) => (
                          <div className="min-w-0 break-words" key={label}>
                            <dt className="muted">{label}</dt>
                            <dd className="font-semibold tabular-nums">
                              {value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <div>
                        <p className="muted">Consumo com desperdício fixo</p>
                        <ul>
                          {r.materials.map((m, j) => (
                            <li className="break-words" key={j}>
                              {m.name}: {decimal(m.consumption)}{" "}
                              {m.unit === "G" ? "g" : "ml"}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {r.result.warnings.includes("BELOW_FULL_COST") ? (
                        <Notice kind="info">
                          O preço não cobre o custo completo modelado deste
                          lote.
                        </Notice>
                      ) : (
                        <p className="muted">
                          O preço cobre o custo completo modelado deste lote.
                        </p>
                      )}
                      {r.result.warnings.includes("ROUNDED_TARGET") && (
                        <p className="muted">
                          A margem efetiva considera o arredondamento do preço
                          por peça.
                        </p>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onSelect(r.quantity)}
                      >
                        Usar {r.quantity} peças
                      </Button>
                    </CardFooter>
                  </article>
                </Card>
              ))}
            </div>
            <p className="muted">
              Cobrir os custos modelados não garante atingir a meta comercial
              nem pagar todas as despesas fixas da empresa. A contribuição é
              calculada antes da depreciação; o resultado após depreciação
              inclui esse custo.
            </p>
            <p className="muted">
              A contribuição por hora divide a contribuição do lote pelo tempo
              de máquina informado. Preparação e acabamento entram como custo,
              mas não nesse tempo. É uma estimativa, não lucro líquido ou
              projeção de capacidade livre. Consumos e tempos são exibidos com
              até duas casas decimais; os cálculos preservam a precisão
              original.
            </p>
          </>
        )}
        <p className="muted">
          Comparar não publica preços nem cria descontos automáticos.
        </p>
      </FieldGroup>
    </details>
  );
}
