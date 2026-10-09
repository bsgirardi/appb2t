import Link from "next/link";
import type { ReportDTO, Summary } from "@/domain/profitability/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/field";
import { moneyText, coverageNames } from "./detail";
export function SummaryCards({ summary: s }: { summary: Summary }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {[
        ["Contribuição prevista", s.expected],
        ["Contribuição realizada", s.actual],
        ["Resultado após custo total", s.afterDepreciation],
      ].map(([label, m]) => {
        const metric = m as Summary["actual"];
        return (
          <Card key={String(label)}>
            <CardHeader>
              <CardTitle>{String(label)}</CardTitle>
              <CardDescription>
                {metric.count} de {s.count} pedidos cobertos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <strong>{moneyText(metric.value)}</strong>
              <p>Receita coberta: {moneyText(metric.coveredRevenue)}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
export function ProfitabilityReport({ result: r }: { result: ReportDTO }) {
  return (
    <div className="flex flex-col gap-4">
      <p>
        {r.total} pedidos · Receita da população normal:{" "}
        {moneyText(r.summary.revenue)}
      </p>
      <SummaryCards summary={r.summary} />
      <p>
        Variação da contribuição:{" "}
        {moneyText(r.summary.contributionChange.value)} · Variação do custo:{" "}
        {moneyText(r.summary.costChange.value)}. Comparação de{" "}
        {r.summary.contributionChange.count} pedidos com ambos os cenários
        completos.
      </p>
      {!r.items.length ? (
        <Notice kind="info">
          Nenhum pedido encontrado para os filtros selecionados.
        </Notice>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Canal efetivo</TableHead>
              <TableHead>Receita</TableHead>
              <TableHead>Contribuição realizada</TableHead>
              <TableHead>Cobertura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {r.items.map((s) => (
              <TableRow key={s.saleId}>
                <TableCell>
                  <Link href={`/rentabilidade/${s.saleId}`}>
                    Pedido {s.number}
                  </Link>
                </TableCell>
                <TableCell>
                  {s.administrative?.channel?.name ?? "Não informado"}
                </TableCell>
                <TableCell>{moneyText(s.revenue)}</TableCell>
                <TableCell>{moneyText(s.actual.contribution.value)}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {coverageNames[s.actual.contribution.coverage]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {(
        [
          ["Por produto", r.products],
          ["Por canal", r.channels],
        ] as const
      ).map(([title, groups]) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Mesma população e cobertura por pedido do relatório.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Receita</TableHead>
                  <TableHead>Contribuição</TableHead>
                  <TableHead>Pedidos cobertos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>{g.name}</TableCell>
                    <TableCell>{moneyText(g.summary.revenue)}</TableCell>
                    <TableCell>{moneyText(g.summary.actual.value)}</TableCell>
                    <TableCell>
                      {g.summary.actual.count}/{g.summary.count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
