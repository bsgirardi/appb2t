"use client";

import { useState } from "react";
import Link from "next/link";
import type { Summary } from "@/domain/profitability/types";
import {
  simulatePerformance,
  type GoalMetric,
  type Rankings,
} from "@/domain/profitability/intelligence";
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
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Field, FieldGroup, Notice } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { moneyText } from "./format";
import { profitabilitySaleHref } from "./navigation";

export function IntelligencePanel({
  summary,
  rankings,
  period,
  returnHref,
}: {
  summary: Summary;
  rankings: Rankings;
  returnHref?: string;
  period: {
    from: string;
    to: string;
    today: string;
    enabled: boolean;
    undated?: boolean;
  };
}) {
  const [goal, setGoal] = useState("");
  const [horizon, setHorizon] = useState("30");
  const [metric, setMetric] = useState<GoalMetric>("revenue");
  const simulation = simulatePerformance(summary, {
    ...period,
    goal,
    horizon,
    metric,
  });
  const quantity = (value: string | null) =>
    value === null
      ? "Indisponível"
      : metric === "orders"
        ? `${Number(value).toLocaleString("pt-BR")} pedidos`
        : moneyText(value);
  return (
    <Card className="profitability-intelligence profitability-reading">
      <CardHeader>
        <CardTitle>Inteligência da operação</CardTitle>
        <CardDescription>
          {period.undated
            ? "Base sem data de confirmação: as datas selecionadas não delimitam estes pedidos."
            : `Base de confirmação: ${period.from} a ${period.to}, em America/Sao_Paulo.`}{" "}
          Mesmos filtros do relatório; todas as páginas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Link href="/rentabilidade/metas">
          Cadastrar metas e acompanhar o mês
        </Link>
        <Notice kind="info">
          Faturamento segue os totais dos pedidos, com descontos e frete.
          Recebimento é o dinheiro baixado no financeiro. Contribuição desconta
          os custos variáveis conhecidos segundo a apuração; não é lucro
          líquido. Despesas gerais, perdas sem pedido e devoluções não
          registradas não são inferidas. Custos posteriores atualizam esta
          leitura.
        </Notice>
        <Accordion type="multiple">
          {(
            [
              ["products", "Ranking por produto"],
              ["customers", "Ranking por cliente"],
              ["channels", "Ranking por canal"],
            ] as const
          ).map(([key, title]) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger>{title}</AccordionTrigger>
              <AccordionContent>
                <p>
                  Contribuição realizada em R$, da maior para a menor. Desempate
                  por nome e identificador. Só recebe posição quem tem cobertura
                  integral. Canceladas e pendências comerciais ficam fora.
                  Cliente usa o cadastro atual; canal usa a revisão efetiva.
                </p>
                {!rankings[key].length ? (
                  <p>Nenhum grupo elegível no período.</p>
                ) : (
                  <Table aria-label={title}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Posição / grupo</TableHead>
                        <TableHead>Faturamento</TableHead>
                        <TableHead>Contribuição coberta</TableHead>
                        <TableHead>Cobertura / fontes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankings[key].map((group) => (
                        <TableRow key={group.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {group.rank === null
                                ? "Sem posição"
                                : `${group.rank}º`}
                            </Badge>
                            <p>{group.name}</p>
                          </TableCell>
                          <TableCell>
                            {moneyText(group.summary.revenue)}
                          </TableCell>
                          <TableCell>
                            {moneyText(group.summary.actual.value)}
                            {group.rank === null && (
                              <p>
                                Subtotal coberto; resultado do grupo incompleto.
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <p>
                              {group.summary.actual.count}/{group.summary.count}{" "}
                              pedidos · receita coberta{" "}
                              {moneyText(group.summary.actual.coveredRevenue)}
                            </p>
                            <details>
                              <summary>Ver pedidos de origem</summary>
                              <ul>
                                {group.sources.map((source) => (
                                  <li key={source.id}>
                                    <Link
                                      href={profitabilitySaleHref(
                                        source.id,
                                        returnHref,
                                      )}
                                    >
                                      Pedido {source.number}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="flex flex-col gap-3">
          <h2>Meta e simulação histórica</h2>
          <p>
            Simulação sem gravação. Para definir uma meta mensal persistente,
            use o acompanhamento de metas mensais.
          </p>
          <p>
            Meta para {period.from} a {period.to}. Simulação temporária: os
            valores são descartados ao sair ou atualizar os filtros. Não cria
            vendas, reservas, recebimentos ou compromissos de produção.
          </p>
          <FieldGroup>
            <div className="field">
              <Label htmlFor="intelligence-metric">Indicador da meta</Label>
              <NativeSelect
                id="intelligence-metric"
                value={metric}
                onChange={(event) =>
                  setMetric(event.target.value as GoalMetric)
                }
              >
                <option value="revenue">Faturamento (R$)</option>
                <option value="contribution">
                  Contribuição realizada (R$)
                </option>
                <option value="orders">Pedidos (unidades)</option>
              </NativeSelect>
            </div>
            <Field
              label="Meta no período"
              type="number"
              min="0.01"
              step={metric === "orders" ? "1" : "0.01"}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              hint={
                metric === "orders"
                  ? "Unidade: pedidos inteiros."
                  : "Unidade: reais (R$)."
              }
            />
            <Field
              label="Horizonte da projeção (dias corridos)"
              type="number"
              min="1"
              max="366"
              step="1"
              value={horizon}
              onChange={(event) => setHorizon(event.target.value)}
            />
          </FieldGroup>
          <div aria-live="polite">
            {simulation.error ? (
              <Notice kind="info">
                {goal || !period.enabled
                  ? simulation.error
                  : "Informe uma meta para comparar com o realizado e simular."}
              </Notice>
            ) : simulation.actual === null ? (
              <Notice kind="info">
                Realizado indisponível: sem pedidos ou contribuição sem
                cobertura integral. Nenhum valor foi substituído por zero.
              </Notice>
            ) : (
              <div className="flex flex-col gap-2">
                <p>
                  Realizado: <strong>{quantity(simulation.actual)}</strong> ·
                  Meta: {quantity(goal)}
                </p>
                <p>
                  Progresso:{" "}
                  {Number(simulation.progress).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  %
                </p>
                <progress
                  aria-label="Progresso da meta"
                  max={100}
                  value={Math.min(
                    100,
                    Math.max(0, Number(simulation.progress)),
                  )}
                  className="w-full"
                />
                {simulation.projectionError ? (
                  <Notice kind="info">{simulation.projectionError}</Notice>
                ) : (
                  <>
                    <p>
                      Extrapolação para {horizon} dias:{" "}
                      <strong>{quantity(simulation.projection)}</strong>
                    </p>
                    <p>
                      Fórmula: {quantity(simulation.actual)} ÷ {simulation.days}{" "}
                      dias corridos × {horizon}. A projeção é um cenário de
                      igual ritmo, sem garantia de demanda, capacidade ou
                      resultado.
                      {metric === "orders" &&
                        " Pedidos fracionários representam média estatística, não pedidos criados."}
                    </p>
                    {simulation.partialDay && (
                      <p>
                        O histórico inclui hoje, ainda parcial em São Paulo;
                        isso pode reduzir a média.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <p>
            Contribuição só é simulada com todos os pedidos cobertos. Esta
            projeção não prevê recebimentos ou lucro líquido e não desconta
            indisponibilidade das impressoras.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/planejamento">
              Conferir capacidade no planejamento
            </Link>
            <Link href="/financeiro">Conferir recebimentos no financeiro</Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
