import type {
  Metric,
  SaleProfitabilityDTO,
  Scenario,
} from "@/domain/profitability/types";
import { StockDecimal as D } from "@/domain/stock/quantities";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/field";
import { ProfitabilityReconciliation } from "./reconciliation";
import { moneyText, coverageNames } from "./format";
export { moneyText, coverageNames } from "./format";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
function Value({ metric }: { metric: Metric }) {
  return (
    <>
      <span>{moneyText(metric.value)}</span>
      {metric.coverage !== "COMPLETE" ? (
        <Badge variant="outline">{coverageNames[metric.coverage]}</Badge>
      ) : null}
      {metric.reasons.length ? (
        <details>
          <summary>Ver pendências</summary>
          <ul>
            {metric.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}
export function Comparison({
  expected,
  actual,
  compositionMissing = false,
}: {
  expected: Scenario;
  actual: Scenario;
  compositionMissing?: boolean;
}) {
  const labels: [keyof Scenario, string][] = [
    ["productive", "Custo produtivo sem depreciação"],
    ["depreciation", "Depreciação"],
    ["totalCost", "Custo produtivo total"],
    ["fees", "Encargos comerciais"],
    ["shipping", "Frete pago"],
    ["contribution", "Contribuição operacional"],
    [
      "afterDepreciation",
      compositionMissing
        ? "Resultado após custo total — composição indisponível"
        : "Resultado após depreciação",
    ],
  ];
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Componente</TableHead>
          <TableHead>Previsto</TableHead>
          <TableHead>Realizado</TableHead>
          <TableHead>Diferença</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {labels.map(([key, label]) => (
          <TableRow key={key}>
            <TableCell>{label}</TableCell>
            <TableCell>
              <Value metric={expected[key]} />
            </TableCell>
            <TableCell>
              <Value metric={actual[key]} />
            </TableCell>
            <TableCell>
              {expected[key].value !== null && actual[key].value !== null
                ? moneyText(
                    new D(actual[key].value!)
                      .minus(expected[key].value!)
                      .toFixed(),
                  )
                : "Indisponível"}
            </TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell>Margem de contribuição</TableCell>
          <TableCell>
            {expected.margin.value === null
              ? "Indisponível"
              : `${new D(expected.margin.value).toFixed(2)}%`}
          </TableCell>
          <TableCell>
            {actual.margin.value === null
              ? "Indisponível"
              : `${new D(actual.margin.value).toFixed(2)}%`}
          </TableCell>
          <TableCell>—</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
export function ProfitabilityDetail({
  value: v,
}: {
  value: SaleProfitabilityDTO;
}) {
  return (
    <div className="flex flex-col gap-4">
      {v.taxSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Efeito tributário estimado</CardTitle>
            <CardDescription>
              Separado dos indicadores operacionais abaixo, que permanecem antes
              de tributos. Estimativa, mesmo quando os custos realizados estão
              completos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p>
              Parcela conhecida: {moneyText(v.taxSummary.knownAmount)} ·{" "}
              {v.taxSummary.complete
                ? "Premissas cobertas"
                : "Cobertura parcial"}
            </p>
            <p>
              Contribuição realizada após tributos estimados:{" "}
              {moneyText(v.taxSummary.actualContributionAfter)}
            </p>
            <p>
              Resultado realizado após depreciação e tributos estimados:{" "}
              {moneyText(v.taxSummary.actualAfterDepreciation)}
            </p>
            <p>{v.taxSummary.reasons.join(" ")}</p>
            <details>
              <summary>Premissas por linha</summary>
              <ul>
                {v.taxSummary.lines.map((l) => (
                  <li key={l.key}>
                    Base {moneyText(l.base)} · tributo {moneyText(l.amount)} ·{" "}
                    {l.reasons.join(" ")}
                  </li>
                ))}
              </ul>
            </details>
            <p className="text-sm text-muted-foreground">
              DAS MEI fixo mensal não é deduzido por venda. Este resumo não é
              lucro líquido nem demonstração contábil e não cria pagamento.
            </p>
          </CardContent>
        </Card>
      )}
      {v.excluded ? (
        <Notice kind="info">
          Pedido fora dos indicadores normais: cancelamento ou pendência
          comercial.
        </Notice>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Pedido {v.number}</CardTitle>
          <CardDescription>
            Receita negociada: {moneyText(v.revenue)} · Canal:{" "}
            {v.administrative?.channel?.name ?? "Não informado"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            Confirmação:{" "}
            {v.confirmedAt
              ? new Date(v.confirmedAt).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })
              : "Sem data comprovada"}
          </p>
          <p>
            Recebido: {moneyText(v.received ?? null)} · A receber:{" "}
            {moneyText(v.pending ?? null)}. Recebimentos não alteram a
            contribuição.
          </p>
          <p>
            Leitura em{" "}
            {new Date(v.readAt).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}
            .
          </p>
          <Comparison
            expected={v.expected}
            actual={v.actual}
            compositionMissing={v.compositionMissing}
          />
          <p>
            Custo produtivo conhecido:{" "}
            {moneyText(v.actual.totalCost.knownValue)}. Valores parciais não
            representam lucro.
          </p>
          <p>
            Custos usam seis casas decimais; a apresentação arredonda para
            centavos.
          </p>
        </CardContent>
      </Card>
      <ProfitabilityReconciliation value={v} />
      {v.lines.map((l) => (
        <Card key={l.key}>
          <CardHeader>
            <CardTitle>{l.description}</CardTitle>
            <CardDescription>
              {l.actual.delivered} de {l.quantity} unidades entregues · receita{" "}
              {moneyText(l.revenue)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Comparison
              expected={l.expectedScenario}
              actual={l.actualScenario}
              compositionMissing={
                l.actual.total !== null && l.actual.components === null
              }
            />
            <p>
              Reservado, ainda não entregue: {moneyText(l.actual.reservedTotal)}
            </p>
            {l.expected ? (
              <p>
                Receita original da memória:{" "}
                {moneyText(l.expected.suggestedRevenue)}. Taxas previstas sobre
                produtos após desconto, sem frete cobrado.
              </p>
            ) : null}
            <details>
              <summary>Memória e fontes de custo</summary>
              <p>
                Memória prevista: {l.expected?.snapshotId ?? "Indisponível"}
              </p>
              {l.actual.components ? (
                <ul>
                  {Object.entries(l.actual.components).map(([k, v]) => (
                    <li key={k}>
                      {(
                        {
                          material: "Material",
                          energy: "Energia",
                          maintenance: "Manutenção",
                          labor: "Mão de obra",
                          depreciation: "Depreciação",
                        } as Record<string, string>
                      )[k] ?? k}
                      : {moneyText(v)}
                    </li>
                  ))}
                </ul>
              ) : null}
              <ul>
                {l.actual.sources.map((s) => (
                  <li key={s.id}>
                    {s.label}: {moneyText(s.value)}{" "}
                    <small className="break-all">({s.id})</small>
                  </li>
                ))}
              </ul>
            </details>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
