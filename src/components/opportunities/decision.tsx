"use client";
import { useState } from "react";
import Link from "next/link";
import Decimal from "decimal.js";
import type { OpportunityQuote } from "@/domain/opportunities/types";
import type { QuoteDTO } from "@/domain/commerce/types";
import { quoteDecisionLines } from "@/domain/opportunities/decision";
import { formatBRL } from "@/domain/calculation/calculate";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export function OpportunityDecision({
  quote,
}: {
  quote: OpportunityQuote | null;
}) {
  // Remount on principal/version changes, so an old response cannot replace the new context.
  return (
    <DecisionQuery
      key={quote ? `${quote.id}:${quote.version}` : "none"}
      quote={quote}
    />
  );
}

function DecisionQuery({ quote }: { quote: OpportunityQuote | null }) {
  const [document, setDocument] = useState<QuoteDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    if (!quote || busy) return;
    setDocument(null);
    setError("");
    setBusy(true);
    try {
      setDocument(await api<QuoteDTO>(`/api/quotes/${quote.id}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const rows = document
    ? quoteDecisionLines(document.input.items ?? [], document.costs)
    : [];
  return (
    <Card className="no-print print:hidden">
      <CardHeader>
        <CardTitle>Decisão comercial</CardTitle>
        <CardDescription>
          Consulta interna do orçamento principal, com as premissas de custo
          preservadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        {quote ? (
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/orcamentos/${quote.id}`}>{quote.number}</Link>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                void load();
              }}
            >
              {busy
                ? "Consultando…"
                : document
                  ? "Atualizar indicadores"
                  : "Consultar indicadores"}
            </Button>
          </div>
        ) : (
          <p>
            Defina um orçamento principal entre os documentos vinculados para
            consultar seus indicadores.
          </p>
        )}
        <div
          aria-live="polite"
          aria-busy={busy}
          className="flex min-w-0 flex-col gap-4"
        >
          {error && <Notice>{error}</Notice>}
          {document && (
            <>
              <p>
                Versão consultada: {document.version} · {document.status}.
                Atualize a consulta após editar o orçamento.
              </p>
              {document.version !== quote?.version && (
                <Notice kind="info">
                  O orçamento mudou desde o carregamento da negociação. Os
                  indicadores abaixo usam a versão consultada.
                </Notice>
              )}
              <p>
                {rows.filter((r) => r.result).length} de {rows.length} itens com
                estimativa de custo válida para esta consulta.
              </p>
              <p className="muted">
                Antes do desconto global de{" "}
                {formatBRL(document.input.discount ?? "0")} e do frete de{" "}
                {formatBRL(document.input.shipping ?? "0")}. A margem
                consolidada do orçamento não está apurada. Receita estimada não
                é faturamento nem recebimento; contribuição e resultado após
                depreciação não são lucro líquido.
              </p>
              {!rows.length && <p>O orçamento ainda não possui itens.</p>}
              <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                {rows.map(
                  ({ item, result, machineMinutes, snapshot }, index) => (
                    <Card key={item.lineId ?? index}>
                      <CardHeader>
                        <CardTitle>{item.description}</CardTitle>
                        <CardDescription>
                          {item.quantity} peças · oferta por peça{" "}
                          {formatBRL(item.unitPrice)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex min-w-0 flex-col gap-3 break-words">
                        {!result || !snapshot ? (
                          <p>
                            Sem custo válido: estimativa ausente, desatualizada
                            ou inválida. Revise no orçamento.
                          </p>
                        ) : (
                          <>
                            <p>
                              Canal preservado: {snapshot.input.channel.name}
                            </p>
                            <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
                              {[
                                [
                                  "Receita estimada do item",
                                  formatBRL(result.offeredRevenue),
                                ],
                                [
                                  "Contribuição estimada",
                                  formatBRL(result.contribution),
                                ],
                                [
                                  "Margem de contribuição",
                                  result.contributionMargin === null
                                    ? "Não aplicável"
                                    : `${new Decimal(result.contributionMargin).toFixed(2).replace(".", ",")}%`,
                                ],
                                [
                                  "Resultado após depreciação",
                                  formatBRL(result.afterDepreciation),
                                ],
                                [
                                  "Tempo de máquina estimado",
                                  `${new Decimal(machineMinutes!).toDecimalPlaces(2).toFixed().replace(".", ",")} min`,
                                ],
                              ].map(([label, value]) => (
                                <div key={label} className="min-w-0">
                                  <dt className="muted">{label}</dt>
                                  <dd className="font-semibold tabular-nums">
                                    {value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                            <p>
                              {result.warnings.includes("BELOW_FULL_COST")
                                ? "A oferta não cobre o custo completo modelado."
                                : "A oferta cobre o custo completo modelado."}
                            </p>
                            <p className="muted">
                              Memória de{" "}
                              {new Date(snapshot.createdAt).toLocaleString(
                                "pt-BR",
                                { timeZone: "America/Sao_Paulo" },
                              )}
                              . Custos e taxas podem diferir dos cadastros
                              atuais.
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>
            </>
          )}
        </div>
        <p className="muted">
          Tempo de máquina não é prazo de entrega. Consulte a fila, os
          calendários e as pendências no planejamento antes de negociar uma
          data. A consulta não reserva capacidade nem garante prazo.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/planejamento">Consultar planejamento</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/calculadora">Simular canais e descontos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/calculadora/cenarios">Comparações salvas</Link>
          </Button>
        </div>
        <p className="muted">
          Consultar e simular não altera o orçamento, não gera recebimentos ou
          movimentos de estoque e não cria compromisso de produção.
        </p>
      </CardContent>
    </Card>
  );
}
