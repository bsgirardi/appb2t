"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { StockDecimal as D } from "@/domain/stock/quantities";
import type {
  RecurrenceEvidence,
  RecurrenceGroup,
  RecurrenceReport,
} from "@/domain/profitability/recurrence";
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
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { coverageNames, moneyText } from "./format";

function preciseMoney(value: string | null) {
  if (value === null) return "Indisponível";
  return new D(value).decimalPlaces() > 2
    ? `${moneyText(value)} (${value.replace(".", ",")} reais em precisão integral)`
    : moneyText(value);
}
function percent(value: string | null) {
  return value === null
    ? "Percentual indisponível"
    : `${new D(value).toFixed(2).replace(".", ",")}%`;
}

function EvidenceList({ items }: { items: RecurrenceEvidence[] }) {
  const [page, setPage] = useState(1);
  const maxPage = Math.max(1, Math.ceil(items.length / 10));
  const shown = items.slice((page - 1) * 10, page * 10);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Table aria-label="Evidências da recorrência">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Pedido / linha</TableHead>
            <TableHead scope="col">Custo produtivo</TableHead>
            <TableHead scope="col">Excesso realizado − previsto</TableHead>
            <TableHead scope="col">Cobertura / rastreabilidade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((e) => (
            <TableRow key={`${e.saleId}:${e.lineKey}`}>
              <TableCell className="max-w-64 break-words [overflow-wrap:anywhere]">
                <Link href={`/rentabilidade/${encodeURIComponent(e.saleId)}`}>
                  Pedido {e.number}
                </Link>
                <p>
                  {e.description} · linha {e.lineKey} · {e.quantity} unidade(s)
                </p>
                <p>Confirmação: {e.confirmedDate ?? "Sem data"}</p>
                <p>Memória: {e.snapshotId ?? "Indisponível"}</p>
                <p>
                  {e.reviewed
                    ? "Conferência vigente"
                    : "Conferência ausente ou desatualizada"}
                  {e.revisionId ? ` · ${e.revisionId}` : ""}
                </p>
              </TableCell>
              <TableCell>
                <p>Previsto: {preciseMoney(e.expected)}</p>
                <p>Realizado: {preciseMoney(e.actual)}</p>
                <p>
                  Conhecido de origem: {moneyText(e.knownCost)} (inclui
                  depreciação; complementos à parte)
                </p>
                {e.provisional ? (
                  <Badge variant="outline">Provisório</Badge>
                ) : null}
              </TableCell>
              <TableCell>
                <p>{preciseMoney(e.difference)}</p>
                <p>{percent(e.differencePercent)}</p>
                <Badge variant="outline">
                  {!e.eligible
                    ? "Fora da amostra"
                    : e.material
                      ? "Desvio material"
                      : "Limite não atingido"}
                </Badge>
              </TableCell>
              <TableCell className="max-w-96 break-words [overflow-wrap:anywhere]">
                {e.reasons.length ? (
                  <ul>
                    {e.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Custo completo e reconciliado.</p>
                )}
                <details>
                  <summary className="cursor-pointer">
                    Ver fontes e composição
                  </summary>
                  <p>
                    Parcela não reconciliada:{" "}
                    {preciseMoney(e.reconciliation.unexplained.value)}
                  </p>
                  <p>
                    Produções:{" "}
                    {e.productionKeys.join(", ") || "Não rastreáveis"}
                  </p>
                  <ul>
                    {e.reconciliation.rows.map((r) => (
                      <li key={r.key}>
                        {r.label}: previsto {preciseMoney(r.expected.value)};
                        realizado {preciseMoney(r.actual.value)} ·{" "}
                        {coverageNames[r.actual.coverage]}
                        {r.actual.coverage !== "COMPLETE"
                          ? ` · conhecido ${moneyText(r.actual.knownValue)}`
                          : ""}
                      </li>
                    ))}
                  </ul>
                  <p>
                    Fontes já incluídas; total de origem inclui depreciação. Não
                    há valor individual de cada componente por fonte.
                  </p>
                  <ul>
                    {e.reconciliation.sources.map((s) => (
                      <li key={`${s.kind}:${s.id}`}>
                        {s.label} · {s.id} · {preciseMoney(s.value)}
                      </li>
                    ))}
                  </ul>
                </details>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {items.length > 10 ? (
        <Pagination aria-label="Paginação de evidências">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Evidências anteriores
              </Button>
            </PaginationItem>
            <PaginationItem>
              <span aria-live="polite">
                {page} de {maxPage}
              </span>
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= maxPage}
                onClick={() => setPage(page + 1)}
              >
                Próximas evidências
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}

function GroupDetails({ group: g }: { group: RecurrenceGroup }) {
  const reasons = new Map<string, number>();
  for (const e of g.evidence)
    for (const reason of e.reasons)
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p>
        {g.materialCount} de {g.eligibleCount} pedidos independentes com desvio
        material (
        {g.eligibleCount
          ? percent(
              new D(g.materialCount).times(100).div(g.eligibleCount).toFixed(),
            )
          : "percentual indisponível"}
        ).
      </p>
      <p>
        {g.eligibleCount} de {g.candidateCount} linhas candidatas têm cobertura
        e independência para esta amostra.
      </p>
      <details>
        <summary className="cursor-pointer">
          Comparar premissas da configuração
        </summary>
        <p>
          {g.configuration.technology} · impressora{" "}
          {g.configuration.printer.name} ({g.configuration.printer.ref.id},
          versão {g.configuration.printer.ref.version})
        </p>
        <p>
          Máquina: {g.configuration.machineFixedMinutes} min fixos +{" "}
          {g.configuration.machineMinutesPerUnit} min/unidade. Preparação:{" "}
          {g.configuration.setupMinutes} min. Acabamento:{" "}
          {g.configuration.finishingMinutesPerUnit} min/unidade.
        </p>
        <ul>
          {g.configuration.materials.map((m, i) => (
            <li key={i}>
              {m.name} ({m.ref.id}, versão {m.ref.version}) · consumo{" "}
              {m.consumptionPerUnit} {m.unit}/unidade · desperdício fixo{" "}
              {m.fixedWaste} {m.unit} · preço-base {moneyText(m.pricePerBase)}
            </li>
          ))}
        </ul>
        <p>
          Energia: {moneyText(g.configuration.energyRate)}; manutenção/hora:{" "}
          {moneyText(g.configuration.maintenancePerHour)}; trabalho/hora:{" "}
          {moneyText(g.configuration.laborPerHour)}; provisão de falhas:{" "}
          {g.configuration.failurePercent}%.
        </p>
        <ul>
          {g.configuration.extras.map((e, i) => (
            <li key={i}>
              {e.name} ({e.ref.id}, versão {e.ref.version}) · {e.quantity} ×{" "}
              {moneyText(e.unitCost)} ·{" "}
              {e.basis === "LOT" ? "por lote" : "por unidade"}
            </li>
          ))}
        </ul>
        <p>
          Equivalência das premissas registradas. Cor, geometria ou arte não
          registradas não têm identidade física certificada.
        </p>
      </details>
      {g.suggestReview ? (
        <Alert>
          <AlertTitle>Conferir a ficha</AlertTitle>
          <AlertDescription>
            Conferir com a equipe as premissas e as fontes abaixo. A repetição
            não demonstra que a ficha causou a diferença. Nenhum parâmetro é
            alterado por esta sugestão.
          </AlertDescription>
        </Alert>
      ) : null}
      {reasons.size ? (
        <details>
          <summary className="cursor-pointer">Motivos fora da amostra</summary>
          <p>Uma linha pode ter vários motivos; as contagens se sobrepõem.</p>
          <ul>
            {[...reasons].map(([reason, n]) => (
              <li key={reason}>
                {reason}: {n}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <EvidenceList items={g.evidence} />
    </div>
  );
}

export function RecurrencePanel({ value }: { value: RecurrenceReport }) {
  const [product, setProduct] = useState("");
  const [page, setPage] = useState(1);
  const selectId = useId();
  const products = new Map(
    value.groups.map((g) => [g.productId, g.description]),
  );
  for (const e of value.ungrouped)
    if (e.productId) products.set(e.productId, e.description);
  const groups = value.groups.filter(
    (g) => !product || g.productId === product,
  );
  const ungrouped = value.ungrouped.filter(
    (e) =>
      !product ||
      (product === "__none__" ? !e.productId : e.productId === product),
  );
  const maxPage = Math.max(1, Math.ceil(groups.length / 5));
  return (
    <Card id="recorrencia-produtiva" className="profitability-reading min-w-0">
      <CardHeader>
        <CardTitle>Recorrência de desvios produtivos</CardTitle>
        <CardDescription>
          Janela própria de 90 dias: {value.period.from} a {value.period.to},
          pela confirmação em São Paulo. Custos atuais, incluindo revisões
          posteriores.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <p>
          Mesma configuração produtiva congelada e quantidade. Mínimo de 5
          pedidos independentes; pelo menos 3 e 60% da amostra elegível com
          excesso de 10% e R$ 5 por linha, simultaneamente. Limites inclusivos.
        </p>
        <details>
          <summary className="cursor-pointer">
            Como interpretar a amostra e os custos
          </summary>
          <p>
            Somente linhas entregues, reconciliadas e com conferência vigente
            sustentam a sugestão. Linhas do mesmo pedido ou com produção
            compartilhada na janela ficam fora da contagem. Cobertura parcial
            não representa a população inteira.
          </p>
          <p>
            Preço, desconto, frete, taxas e comissão não integram o critério.
            Provisão de falhas não é custo causal medido; perdas vinculadas já
            estão incluídas. Depreciação, contribuição, resultado e caixa
            permanecem distintos.
          </p>
        </details>
        <FieldGroup>
          <Label htmlFor={selectId}>Produto na recorrência</Label>
          <NativeSelect
            id={selectId}
            value={product}
            onChange={(e) => {
              setProduct(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos os produtos</option>
            {[...products]
              .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
              .map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            <option value="__none__">Sem produto vinculado</option>
          </NativeSelect>
        </FieldGroup>
        <p>
          Janela e filtro próprios por linha, independentes dos filtros do
          relatório acima. A paginação não muda a amostra.
        </p>
        <p role="status">
          Produto aplicado:{" "}
          {product === "__none__"
            ? "Sem produto vinculado"
            : (products.get(product) ?? "Todos os produtos")}
          . {groups.length} configurações comparáveis; {ungrouped.length} linhas
          sem grupo comparável.
        </p>
        {!groups.length ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Sem linhas comparáveis</EmptyTitle>
              <EmptyDescription>
                Não há grupo comparável neste recorte; isso não comprova
                ausência de desvios.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Accordion key={product} type="multiple">
            {groups.slice((page - 1) * 5, page * 5).map((g) => (
              <AccordionItem key={g.key} value={g.key}>
                <AccordionTrigger>
                  <span className="flex flex-wrap items-center gap-2">
                    <span>
                      {g.description} · quantidade {g.quantity}
                    </span>
                    <span>
                      {g.configuration.technology} ·{" "}
                      {g.configuration.printer.name} ·{" "}
                      {g.configuration.materials
                        .map((m) => `${m.name} v${m.ref.version}`)
                        .join(", ")}
                    </span>
                    <Badge variant="outline">
                      {g.suggestReview
                        ? "Sugestão de conferência"
                        : g.eligibleCount < 5
                          ? "Amostra insuficiente"
                          : "Critério não atingido"}
                    </Badge>
                    <span>
                      {g.eligibleCount} de {g.candidateCount} linhas elegíveis;{" "}
                      {g.materialCount} pedidos com desvio material.
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <GroupDetails group={g} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
        {groups.length > 5 ? (
          <Pagination aria-label="Paginação de configurações">
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Configurações anteriores
                </Button>
              </PaginationItem>
              <PaginationItem>
                <span aria-live="polite">
                  {page} de {maxPage}
                </span>
              </PaginationItem>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= maxPage}
                  onClick={() => setPage(page + 1)}
                >
                  Próximas configurações
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
        {ungrouped.length ? (
          <details>
            <summary className="cursor-pointer">
              Dados sem grupo comparável ({ungrouped.length})
            </summary>
            <p>
              Memória ou produto indisponível: valores conhecidos e motivos
              preservados; nenhuma repetição inferida pela descrição.
            </p>
            <EvidenceList key={product} items={ungrouped} />
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
