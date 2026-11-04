import { StockDecimal as D } from "@/domain/stock/quantities";
import {
  reconcileSale,
  type LineReconciliation,
  type ReconciliationEffect,
  type SaleReconciliation,
} from "@/domain/profitability/reconciliation";
import type {
  Metric,
  SaleProfitabilityDTO,
} from "@/domain/profitability/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { coverageNames, moneyText } from "./format";
import { ProductiveCostReconciliation } from "./productive-reconciliation";

function Amount({
  value,
  percent = false,
  signed = false,
}: {
  value: Metric;
  percent?: boolean;
  signed?: boolean;
}) {
  const number = value.value === null ? null : new D(value.value);
  const text =
    number === null
      ? "Indisponível"
      : percent
        ? `${number.toFixed(2).replace(".", ",")}%`
        : signed && !number.isZero()
          ? `${number.isNegative() ? "−" : "+"} ${moneyText(number.abs().toFixed())}`
          : moneyText(number.toFixed());
  return (
    <div className="flex flex-col gap-1">
      <span>{text}</span>
      {value.coverage !== "COMPLETE" ? (
        <Badge variant="outline">{coverageNames[value.coverage]}</Badge>
      ) : null}
      {value.reasons.map((reason) => (
        <small key={reason}>{reason}</small>
      ))}
    </div>
  );
}

function Effects({
  title,
  effects,
  closed,
  commercial,
}: {
  title: string;
  effects: ReconciliationEffect[];
  closed: boolean;
  commercial: boolean;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h3 className="font-semibold">{title}</h3>
      <Table aria-label={title}>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Efeito na contribuição</TableHead>
            <TableHead scope="col">Valor</TableHead>
            <TableHead scope="col">Origem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {effects.map((e) => (
            <TableRow key={e.key}>
              <TableCell>{e.label}</TableCell>
              <TableCell>
                <Amount value={e.amount} signed />
              </TableCell>
              <TableCell className="max-w-72 break-words [overflow-wrap:anywhere]">
                {e.source}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p>
        {closed
          ? commercial
            ? "Passagem comercial reconciliada."
            : "Passagem ao realizado reconciliada."
          : commercial
            ? "Passagem comercial incompleta ou divergente; confira as pendências e fontes."
            : "Passagem ao realizado incompleta ou divergente; confira as pendências e fontes."}
      </p>
    </section>
  );
}

function Bridge({ value }: { value: LineReconciliation | SaleReconciliation }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Table aria-label="Etapas da contribuição">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Etapa</TableHead>
            <TableHead scope="col">Receita</TableHead>
            <TableHead scope="col">Contribuição</TableHead>
            <TableHead scope="col">Margem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(
            [
              ["Receita da memória", value.reference],
              ["Previsto na venda", value.negotiated],
              ["Realizado", value.actual],
            ] as const
          ).map(([name, stage]) => (
            <TableRow key={name}>
              <TableCell>{name}</TableCell>
              <TableCell>{moneyText(stage.revenue)}</TableCell>
              <TableCell>
                <Amount value={stage.contribution} />
              </TableCell>
              <TableCell>
                <Amount value={stage.margin} percent />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Effects
        title="Da memória à venda"
        effects={value.commercialEffects}
        closed={value.commercialClosed}
        commercial
      />
      <Effects
        title="Do previsto ao realizado"
        effects={value.actualEffects}
        closed={value.actualClosed}
        commercial={false}
      />
    </div>
  );
}

export function ProfitabilityReconciliation({
  value,
}: {
  value: SaleProfitabilityDTO;
}) {
  const result = reconcileSale(value);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Como a contribuição mudou</h2>
        </CardTitle>
        <CardDescription>
          A referência é a receita da memória de preço; ela não comprova um
          histórico de negociação ou orçamento enviado ao cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <p>
          Valores positivos aumentam a contribuição; negativos a reduzem. Cada
          margem usa a receita da sua etapa. Os percentuais não são somados.
        </p>
        <Bridge value={result} />
        <p>
          O custo produtivo inclui as perdas e complementos já atribuídos. As
          fontes não são somadas novamente. Depreciação e recebimentos
          permanecem nos indicadores separados da venda.
        </p>
        {result.lines.map((line, index) => (
          <details key={line.key} className="min-w-0">
            <summary className="cursor-pointer break-words [overflow-wrap:anywhere]">
              Detalhar linha {index + 1}: {value.lines[index].description}
            </summary>
            <div className="flex min-w-0 flex-col gap-3 py-3">
              <p className="break-all">
                Memória: {line.referenceSnapshotId ?? "Indisponível"} · Linha:{" "}
                {line.key}
              </p>
              <Bridge value={line} />
              <ProductiveCostReconciliation
                line={value.lines[index]}
                administrative={value.administrative}
              />
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
