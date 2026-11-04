"use client";
import { useState } from "react";
import type { QuoteDTO } from "@/domain/commerce/types";
import { quoteConsolidation } from "@/domain/opportunities/consolidation";
import { formatBRL } from "@/domain/calculation/calculate";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Field, FieldGroup, Notice } from "@/components/ui/field";

export function QuoteConsolidation({ document }: { document: QuoteDTO }) {
  const [shippingCost, setShippingCost] = useState("");
  const [shippingFees, setShippingFees] = useState("");
  const result = quoteConsolidation(document.input, document.costs, {
    shippingCost,
    shippingFees,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulação consolidada do orçamento</CardTitle>
        <CardDescription>
          Após desconto global e frete cobrado. Premissas temporárias,
          descartadas ao atualizar a consulta.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p>
          {result.covered}/{result.total} itens com memória válida. Desconto
          proporcional à receita bruta de cada linha, com rateio exato em
          centavos. Taxas percentuais das memórias incidem nos produtos após
          desconto; o custo fixo de cada memória é preservado uma vez por linha.
        </p>
        <FieldGroup>
          <Field
            label="Custo de envio previsto (R$)"
            type="number"
            min="0"
            step="0.01"
            value={shippingCost}
            onChange={(event) => setShippingCost(event.target.value)}
            hint="Custo para a operação, diferente do frete cobrado ao cliente. Informe 0 somente se confirmado."
          />
          <Field
            label="Encargos previstos sobre o frete (R$)"
            type="number"
            min="0"
            step="0.01"
            value={shippingFees}
            onChange={(event) => setShippingFees(event.target.value)}
            hint="Total declarado de taxas e encargos incidentes no frete; não presumimos incidência zero."
          />
        </FieldGroup>
        <div aria-live="polite">
          {result.error ? (
            <Notice kind="info">
              Consolidado indisponível: {result.error}
            </Notice>
          ) : (
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                [
                  "Oferta total após desconto e frete",
                  formatBRL(result.revenue!),
                ],
                [
                  "Taxas percentuais sobre produtos",
                  formatBRL(result.productFees!),
                ],
                [
                  "Contribuição consolidada estimada",
                  formatBRL(result.contribution!),
                ],
                [
                  "Margem consolidada estimada",
                  result.margin === null
                    ? "Não aplicável"
                    : `${result.margin.replace(".", ",")}%`,
                ],
                [
                  "Resultado estimado após depreciação",
                  formatBRL(result.afterDepreciation!),
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <p>
          Fórmula: oferta total − custos variáveis das memórias − taxas dos
          produtos após desconto − envio previsto − encargos declarados sobre o
          frete. É uma simulação com premissas preservadas e declaradas, não
          lucro líquido, faturamento ou recebimento. Não grava o orçamento nem
          cria compromissos.
        </p>
      </CardContent>
    </Card>
  );
}
