"use client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
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
    <section className="finance-reading">
      <div className="page-heading">
        <div>
          <h1>Financeiro</h1>
          <p>
            Posição em {today.split("-").reverse().join("/")} · Saldo atual,
            títulos em aberto e movimentos realizados têm alcances diferentes.
          </p>
        </div>
      </div>
      <h2>Posição e obrigações</h2>
      <div className="dashboard-metrics">
        {cards.slice(0, 3).map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle>{label}</CardTitle>
              <CardDescription>
                {label === "Saldo atual das contas"
                  ? "Posição atual das contas selecionadas; independe do período e dos demais filtros."
                  : "Valor ainda em aberto nos títulos selecionados, incluindo vencidos. Não é movimento realizado."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <strong className="finance-value">{money(value)}</strong>
            </CardContent>
          </Card>
        ))}
      </div>
      <Accordion
        type="single"
        collapsible
        defaultValue={
          Number(data.receivableOverdue) > 0 || Number(data.payableOverdue) > 0
            ? "details"
            : undefined
        }
      >
        <AccordionItem value="details">
          <AccordionTrigger>
            Vencimentos e movimentação do período
          </AccordionTrigger>
          <AccordionContent>
            <div className="finance-grid">
              {cards.slice(3).map(([label, value]) => (
                <Card key={label}>
                  <CardHeader>
                    <CardTitle>{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <strong className="finance-value">{money(value)}</strong>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <p>
        O saldo atual inclui o saldo inicial e todas as movimentações das contas
        selecionadas. Transferências e ajustes não compõem entradas e saídas
        operacionais.
      </p>
    </section>
  );
}
