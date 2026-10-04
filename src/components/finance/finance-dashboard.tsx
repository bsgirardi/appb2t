"use client";
import { Card } from "@/components/ui/card";
import type { FinanceDashboardDTO } from "@/domain/finance/types";
import { money } from "./shared";
export function FinanceDashboard({
  data,
  today,
}: {
  data: FinanceDashboardDTO;
  today: string;
}) {
  const cards = [
    ["Saldo atual das contas", data.balance],
    ["A receber · previsto", data.receivablePending],
    ["A pagar · previsto", data.payablePending],
    ["Recebíveis vencidos", data.receivableOverdue],
    ["Pagáveis vencidos", data.payableOverdue],
    ["Entradas realizadas no período", data.realizedIn],
    ["Saídas realizadas no período", data.realizedOut],
  ];
  return (
    <section>
      <div className="page-heading">
        <div>
          <div className="eyebrow">GESTÃO INTERNA</div>
          <h1>Financeiro</h1>
          <p>
            Posição em {today.split("-").reverse().join("/")} · Valores
            previstos e realizados separados.
          </p>
        </div>
      </div>
      <div className="finance-grid">
        {cards.map(([label, value]) => (
          <Card key={label} asChild>
            <article className="finance-account" >
              <small>{label}</small>
              <strong className="finance-value">{money(value)}</strong>
            </article>
          </Card>
        ))}
      </div>
      <p>
        O saldo atual inclui o saldo inicial e todas as movimentações das contas
        selecionadas. Transferências e ajustes não compõem entradas e saídas
        operacionais.
      </p>
    </section>
  );
}
