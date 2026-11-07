import Decimal from "decimal.js";
import type { CalculatedAlternative } from "@/domain/pricing/comparisons/types";
import { formatBRL } from "@/domain/calculation/calculate";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export function ComparisonResults({
  value,
  index = 0,
  origin,
  onUse,
}: {
  value: CalculatedAlternative;
  index?: number;
  origin?: string;
  onUse?: () => void;
}) {
  const { input, result, metrics: m } = value;
  const percent = (v: string | null) =>
    v === null
      ? "Não aplicável"
      : `${new Decimal(v).toFixed(2).replace(".", ",")}%`;
  const money = (v: string | null) =>
    v === null ? "Meta inviável neste canal" : formatBRL(v);
  const fields = [
    ["Preço antes do desconto por peça", money(m.referenceUnitPrice)],
    ["Desconto efetivo no lote", money(m.discountAmount)],
    ["Preço final por peça", money(m.finalUnitPrice)],
    ["Receita do lote", money(result.offeredRevenue)],
    ["Contribuição estimada", money(result.contribution)],
    ["Margem de contribuição", percent(result.contributionMargin)],
    ["Resultado após depreciação", money(result.afterDepreciation)],
    ["Custo completo do lote", money(result.fullCost)],
    ["Taxas sobre a receita", money(result.fees)],
    ["Custo fixo do canal por lote", money(result.commercialFixed)],
    ["Preço para cobrir custos por peça", money(m.coverageUnitPrice)],
    ["Preço para a meta por peça", money(m.targetUnitPrice)],
    ["Preço para cobertura e meta por peça", money(m.requiredUnitPrice)],
    ["Variação da contribuição com desconto", money(m.contributionChange)],
    [
      "Variação da margem com desconto",
      m.marginChangePoints === null
        ? "Não aplicável"
        : `${new Decimal(m.marginChangePoints).toFixed(2).replace(".", ",")} p.p.`,
    ],
  ];
  return (
    <Card asChild>
      <article aria-label={`Oferta ${index + 1}: ${input.channel.name}`}>
        <CardHeader>
          <CardTitle>
            <h3>
              {input.channel.name} · {value.discountPercent.replace(".", ",")}%
              de desconto
            </h3>
          </CardTitle>
          <CardDescription>
            {origin ? `${origin} · ` : ""}
            {input.quantity} peças · Meta de contribuição{" "}
            {percent(input.targetMarginPercent)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {result.tax && (
            <p className="text-sm text-muted-foreground">
              {result.tax.amount === null
                ? "Cobertura tributária indisponível: indicadores e preços de cobertura abaixo não incluem tributos não identificados."
                : input.tax?.profile?.regime === "MEI"
                  ? "DAS MEI fixo mensal, sem rateio por venda; resultados antes dos custos fixos do mês."
                  : `Tributo estimado ${formatBRL(result.tax.amount)}, já deduzido da contribuição; alíquota informada ${input.tax?.profile?.percent}%.`}
            </p>
          )}
          <p className="muted">
            Taxas configuradas:{" "}
            {input.channel.fees
              .map((f) => `${f.label}: ${f.percent.replace(".", ",")}%`)
              .join("; ") || "nenhuma"}
            .
          </p>
          <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
            {fields.map(([label, v]) => (
              <div className="min-w-0 break-words" key={label}>
                <dt className="muted">{label}</dt>
                <dd className="font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <p>
            {m.coversFullCost
              ? "Cobre os custos completos modelados."
              : "Não cobre os custos completos modelados."}{" "}
            {m.meetsTarget
              ? "Atinge a meta de contribuição."
              : "Não atinge a meta de contribuição."}
          </p>
          {m.targetUnavailableReason && <p>{m.targetUnavailableReason}</p>}
        </CardContent>
        {onUse && (
          <CardFooter>
            <Button type="button" variant="outline" onClick={onUse}>
              Usar oferta {index + 1}
            </Button>
          </CardFooter>
        )}
      </article>
    </Card>
  );
}
