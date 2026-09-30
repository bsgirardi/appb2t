"use client";
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
          <div className="card table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Entradas</th>
                  <th>Saídas</th>
                  <th>Transferências líquidas</th>
                  <th>Ajustes líquidos</th>
                  <th>Saldo ao final</th>
                </tr>
              </thead>
              <tbody>
                {(value as CashDay[]).map((day) => (
                  <tr key={day.date}>
                    <td>{dateLabel(day.date)}</td>
                    <td>{money(day.incoming)}</td>
                    <td>{money(day.outgoing)}</td>
                    <td>{money(day.transfersNet)}</td>
                    <td>{money(day.adjustmentsNet)}</td>
                    <td>{money(day.closingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!(value as CashDay[]).length && (
              <p className="commerce-form">Nenhum valor neste período.</p>
            )}
          </div>
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
