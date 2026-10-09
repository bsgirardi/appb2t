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
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
export const coverageNames = {
  UNAVAILABLE: "Indisponível",
  PARTIAL: "Parcial",
  PROVISIONAL: "Provisório",
  COMPLETE: "Completo",
};
export function moneyText(v: string | null) {
  if (v === null) return "Indisponível";
  const [whole, fraction] = new D(v).toFixed(2).split(".");
  return `R$ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${fraction}`;
}
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
            />
            <p>
              Reservado, ainda não entregue: {moneyText(l.actual.reservedTotal)}
            </p>
            {l.expected ? (
              <p>
                Preço sugerido original do lote:{" "}
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
