"use client";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import type { CashDay } from "@/domain/finance/types";
import { money, dateLabel } from "./shared";
export function CashFlow({
  realized,
  projected,
  overdueNet,
}: {
  realized: CashDay[];
  projected: CashDay[];
  overdueNet: string;
}) {
  return (
    <section className="finance-reading">
      <h2>Fluxo de caixa</h2>
      <p>
        Vencidos em aberto, líquido: <strong>{money(overdueNet)}</strong>. A
        projeção parte do saldo atual, considera esses vencidos e soma apenas
        valores ainda não baixados. Ela depende das datas previstas, sem
        garantia de recebimento.
      </p>
      {[
        ["Realizado", realized],
        ["Previsto", projected],
      ].map(([label, value]) => (
        <div key={String(label)}>
          <h3>
            {String(label)}
            {label === "Realizado"
              ? " — movimentos por data efetiva"
              : " — títulos por vencimento"}
          </h3>
          <p>
            {label === "Realizado"
              ? "Entradas e saídas já registradas nas contas. Estornos têm sinal inverso na data efetiva."
              : "Valores ainda em aberto. A previsão não registra recebimento nem pagamento."}
          </p>
          <Card asChild>
            <div className="table-scroll">
              <Table
                aria-label={`Fluxo de caixa ${label === "Realizado" ? "realizado" : "previsto"}`}
              >
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {label === "Realizado"
                        ? "Data efetiva"
                        : "Vencimento previsto"}
                    </TableHead>
                    <TableHead className="finance-amount text-right">
                      Entradas
                    </TableHead>
                    <TableHead className="finance-amount text-right">
                      Saídas
                    </TableHead>
                    <TableHead className="finance-amount text-right">
                      Transferências líquidas
                    </TableHead>
                    <TableHead className="finance-amount text-right">
                      Ajustes líquidos
                    </TableHead>
                    <TableHead className="finance-amount text-right">
                      Saldo {label === "Realizado" ? "realizado" : "previsto"}{" "}
                      ao final
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(value as CashDay[]).map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>{dateLabel(day.date)}</TableCell>
                      <TableCell className="finance-amount">
                        {money(day.incoming)}
                      </TableCell>
                      <TableCell className="finance-amount">
                        {money(day.outgoing)}
                      </TableCell>
                      <TableCell className="finance-amount">
                        {money(day.transfersNet)}
                      </TableCell>
                      <TableCell className="finance-amount">
                        {money(day.adjustmentsNet)}
                      </TableCell>
                      <TableCell className="finance-amount">
                        {money(day.closingBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!(value as CashDay[]).length && (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>
                      {label === "Realizado"
                        ? "Nenhum movimento no período"
                        : "Nenhuma linha de projeção no período"}
                    </EmptyTitle>
                    <EmptyDescription>
                      Revise o período e os critérios aplicados. A ausência de
                      linhas não representa saldo zero. Na previsão, confira
                      também os vencidos em aberto informados acima.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
          </Card>
        </div>
      ))}
      <p>
        Estornos aparecem na data efetiva, com sinal inverso. O saldo realizado
        inclui todos os movimentos da conta; filtros de categoria ou tipo afetam
        as colunas de movimentação.
      </p>
    </section>
  );
}
