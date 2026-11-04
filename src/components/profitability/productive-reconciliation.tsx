import { StockDecimal as D } from "@/domain/stock/quantities";
import { reconcileProductiveLine } from "@/domain/profitability/productive-reconciliation";
import type {
  AdministrativePayload,
  Metric,
  ProfitabilityLineDTO,
} from "@/domain/profitability/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { coverageNames, moneyText } from "./format";

function ProductiveAmount({
  value,
  signed = false,
}: {
  value: Metric;
  signed?: boolean;
}) {
  const amount = value.value === null ? null : new D(value.value);
  return (
    <div className="flex flex-col gap-1">
      <span>
        {amount === null
          ? "Indisponível"
          : signed && !amount.isZero()
            ? `${amount.isNegative() ? "−" : "+"} ${moneyText(amount.abs().toFixed())}`
            : moneyText(amount.toFixed())}
      </span>
      {value.coverage !== "COMPLETE" ? (
        <>
          <Badge variant="outline">{coverageNames[value.coverage]}</Badge>
          {!signed && value.coverage !== "UNAVAILABLE" ? (
            <small>Conhecido: {moneyText(value.knownValue)}</small>
          ) : null}
        </>
      ) : null}
      {value.reasons.map((reason) => (
        <small key={reason}>{reason}</small>
      ))}
    </div>
  );
}

export function ProductiveCostReconciliation({
  line,
  administrative,
}: {
  line: ProfitabilityLineDTO;
  administrative: AdministrativePayload | null;
}) {
  const result = reconcileProductiveLine(line, administrative);
  return (
    <section
      className="flex min-w-0 flex-col gap-3"
      aria-label="Detalhamento do custo produtivo"
    >
      <h3>Como o custo produtivo variou</h3>
      <p>
        Valores positivos aumentam a contribuição. Os componentes realizados são
        atribuídos por rateio das fontes da linha, incluindo custos de falhas
        incorporados às peças boas.
      </p>
      <Table aria-label="Composição da variação produtiva">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Componente</TableHead>
            <TableHead scope="col">Previsto</TableHead>
            <TableHead scope="col">Realizado atribuído</TableHead>
            <TableHead scope="col">Efeito na contribuição</TableHead>
            <TableHead scope="col">Origem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell>{row.label}</TableCell>
              <TableCell>
                <ProductiveAmount value={row.expected} />
              </TableCell>
              <TableCell>
                <ProductiveAmount value={row.actual} />
              </TableCell>
              <TableCell>
                <ProductiveAmount value={row.effect} signed />
              </TableCell>
              <TableCell className="max-w-72 break-words [overflow-wrap:anywhere]">
                {row.source}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p>
        Custo adicional nesta abertura: zero; custos efetivos já incluídos nos
        componentes. A linha de provisão para falhas explica uma parcela
        prevista; seu efeito positivo não comprova economia ou ausência de
        falhas. O custo causal das falhas não foi medido separadamente.
      </p>
      <p>
        Extras previstos e complementos realizados podem ter classificações
        diferentes. Extras confirmados em fontes produtivas continuam em
        material, trabalho ou outros componentes, sem nova cobrança por
        confirmação.
      </p>
      <div className="flex flex-col gap-1">
        <span>Variação produtiva agregada</span>
        <ProductiveAmount value={result.aggregateEffect} signed />
        <span>Parcela não reconciliada</span>
        <ProductiveAmount value={result.unexplained} signed />
        {result.unexplained.value !== null &&
        !new D(result.unexplained.value).isZero() ? (
          <small>
            Precisão da parcela não reconciliada:{" "}
            {new D(result.unexplained.value).toFixed().replace(".", ",")} reais.
            Não atribuída a uma causa.
          </small>
        ) : null}
      </div>
      <p>
        {result.closed
          ? "Abertura produtiva reconciliada."
          : "Abertura produtiva incompleta ou divergente; confira as fontes e pendências."}
      </p>
      {result.reasons.map((reason) => (
        <p key={reason}>{reason}</p>
      ))}
      <details>
        <summary className="cursor-pointer">
          Fontes que compõem o custo atribuído
        </summary>
        <p>
          Estas fontes já integram os totais. Não há valor individual por
          componente de cada fonte nesta abertura.
        </p>
        {result.sources.length ? (
          <ul>
            {result.sources.map((s) => (
              <li
                key={`${s.kind}:${s.id}`}
                className="break-words [overflow-wrap:anywhere]"
              >
                {s.label} · {s.id} · {moneyText(s.value)} (total de origem,
                inclui depreciação)
              </li>
            ))}
          </ul>
        ) : (
          <p>Sem identificadores de fontes no registro.</p>
        )}
      </details>
      {result.includedLosses.length > 0 ? (
        <div className="flex flex-col gap-1">
          <h4>Perdas já incluídas</h4>
          <p>
            Valor informativo já incorporado ao custo da linha; inclui
            depreciação. Não somar novamente nem tratar como custo causal de
            falhas nas peças boas.
          </p>
          <ul>
            {result.includedLosses.map((s) => (
              <li key={s.id} className="break-words [overflow-wrap:anywhere]">
                {s.id} · {moneyText(s.value)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p>
        Depreciação e caixa permanecem nos indicadores separados. Reservas não
        entram como entrega realizada.
      </p>
    </section>
  );
}
