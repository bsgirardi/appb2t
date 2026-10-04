"use client";
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
    <section>
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
          <h3>{String(label)}</h3>
          <Card asChild>
            <div className="table-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Entradas</TableHead>
                    <TableHead>Saídas</TableHead>
                    <TableHead>Transferências líquidas</TableHead>
                    <TableHead>Ajustes líquidos</TableHead>
                    <TableHead>Saldo ao final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(value as CashDay[]).map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>{dateLabel(day.date)}</TableCell>
                      <TableCell>{money(day.incoming)}</TableCell>
                      <TableCell>{money(day.outgoing)}</TableCell>
                      <TableCell>{money(day.transfersNet)}</TableCell>
                      <TableCell>{money(day.adjustmentsNet)}</TableCell>
                      <TableCell>{money(day.closingBalance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!(value as CashDay[]).length && (
                <p className="commerce-form">Nenhum valor neste período.</p>
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
