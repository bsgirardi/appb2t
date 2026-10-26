import { db } from "@/lib/db";
import { assertAdmin } from "@/server/auth/authorization";
import { requireProfitabilityAdmin } from "@/server/profitability/authorization";
import { readSaleSources } from "@/server/profitability/sources";
import { calculateSale } from "@/domain/profitability/calculate";
import { aggregateSales } from "@/domain/profitability/aggregate";
import {
  hourlyResult,
  measuredMachineMinutes,
} from "@/domain/dashboard/financial";
import type { Actor } from "@/server/auth/session";
import type {
  DashboardFilter,
  DashboardPanelDTO,
} from "@/domain/dashboard/types";
import type { SaleProfitabilityDTO } from "@/domain/profitability/types";
import {
  D,
  emptyPanel,
  metric,
  sum,
  instantDay,
  moneyText,
  numberText,
  statusChart,
} from "./shared";

export async function getProfitabilityDashboard(
  actor: Actor,
  f: DashboardFilter,
): Promise<DashboardPanelDTO> {
  assertAdmin(actor);
  await requireProfitabilityAdmin(actor);
  return db.$transaction(
    async (tx) => {
      const candidates = await tx.sale.findMany({
        where: { status: { notIn: ["RASCUNHO", "CANCELADA"] } },
        select: {
          id: true,
          events: {
            where: { action: { in: ["CONFIRM", "CONVERT"] } },
            select: { createdAt: true },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: 1,
          },
        },
      });
      const ids = candidates
        .filter(
          (s) =>
            s.events[0] &&
            instantDay(s.events[0].createdAt) >= f.previousFrom &&
            instantDay(s.events[0].createdAt) <= f.to,
        )
        .map((s) => s.id);
      const all: SaleProfitabilityDTO[] = [];
      for (let i = 0; i < ids.length; i += 50)
        all.push(
          ...(await readSaleSources(tx, ids.slice(i, i + 50))).map(
            calculateSale,
          ),
        );
      const rows = all.filter(
        (s) =>
          !s.excluded &&
          s.confirmedAt &&
          instantDay(new Date(s.confirmedAt)) >= f.from &&
          instantDay(new Date(s.confirmedAt)) <= f.to,
      );
      const previous = all.filter(
        (s) =>
          !s.excluded &&
          s.confirmedAt &&
          instantDay(new Date(s.confirmedAt)) >= f.previousFrom &&
          instantDay(new Date(s.confirmedAt)) <= f.previousTo,
      );
      const report = aggregateSales(rows),
        prior = aggregateSales(previous);
      const events = rows.length
        ? await tx.productionEvent.findMany({
            where: {
              kind: "REPORT",
              line: { order: { saleId: { in: rows.map((s) => s.saleId) } } },
            },
            select: {
              id: true,
              timeComplete: true,
              machineMinutes: true,
              premises: true,
              line: { select: { order: { select: { saleId: true } } } },
              corrections: { select: { machineMinutes: true } },
              planningReports: {
                select: {
                  participation: {
                    select: {
                      batch: {
                        select: {
                          id: true,
                          state: true,
                          milestones: {
                            select: {
                              id: true,
                              sourceId: true,
                              kind: true,
                              instant: true,
                            },
                          },
                          participants: {
                            select: {
                              line: {
                                select: { order: { select: { saleId: true } } },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          })
        : [];
      const hoursBySale = new Map<string, string | null>();
      for (const sale of rows) {
        const saleEvents = events.filter(
          (e) => e.line.order.saleId === sale.saleId,
        );
        let valid = sale.status === "ENTREGUE" && saleEvents.length > 0;
        const batches = new Map<string, string>();
        let minutes = new D(0);
        for (const e of saleEvents) {
          if (!e.timeComplete) {
            valid = false;
            continue;
          }
          if (!e.planningReports.length) {
            const measured = measuredMachineMinutes({
              timeComplete: e.timeComplete,
              machineMinutes: e.machineMinutes?.toString() ?? null,
              premises: e.premises,
              corrections: e.corrections.map((c) => ({
                machineMinutes: c.machineMinutes?.toString() ?? null,
              })),
            });
            if (measured === null) {
              valid = false;
              continue;
            }
            minutes = minutes.plus(measured);
            continue;
          }
          const lots = [
            ...new Map(
              e.planningReports.map((l) => [
                l.participation.batch.id,
                l.participation.batch,
              ]),
            ).values(),
          ];
          if (lots.length !== 1) {
            valid = false;
            continue;
          }
          const b = lots[0];
          if (
            b.state !== "CLOSED" ||
            b.participants.some((p) => p.line.order.saleId !== sale.saleId)
          ) {
            valid = false;
            continue;
          }
          const replaced = new Set(
            b.milestones.flatMap((m) => (m.sourceId ? [m.sourceId] : [])),
          );
          const milestones = b.milestones.filter((m) => !replaced.has(m.id));
          const start = milestones.find((m) => m.kind === "PRINT_START"),
            end = milestones.find(
              (m) => m.kind === "PRINT_END" || m.kind === "INTERRUPT",
            );
          if (!start || !end || end.instant < start.instant) {
            valid = false;
            continue;
          }
          batches.set(
            b.id,
            String((end.instant.getTime() - start.instant.getTime()) / 60000),
          );
        }
        hoursBySale.set(
          sale.saleId,
          valid ? minutes.plus(sum([...batches.values()])).toFixed() : null,
        );
      }
      const eligible = rows.map((s) => ({
        sale: s,
        perHour: hourlyResult(
          s.actual.contribution.value,
          hoursBySale.get(s.saleId) ?? null,
          s.actual.contribution.coverage,
        ),
      }));
      const eligibleHours = eligible.filter((s) => s.perHour !== null);
      const perHour = eligibleHours.length
        ? hourlyResult(
            sum(
              eligibleHours.map((s) => s.sale.actual.contribution.value!),
            ).toFixed(),
            sum(
              eligibleHours.map((s) => hoursBySale.get(s.sale.saleId)!),
            ).toFixed(),
            "COMPLETE",
          )
        : null;
      const actualCosts = rows.filter((s) => s.actual.totalCost.value !== null),
        expectedCosts = rows.filter((s) => s.expected.totalCost.value !== null);
      const threshold = new D(f.margin ?? "0");
      const low = rows
        .filter(
          (s) =>
            s.actual.margin.value !== null &&
            new D(s.actual.margin.value).lt(threshold),
        )
        .sort((a, b) =>
          new D(a.actual.margin.value!).cmp(b.actual.margin.value!),
        );
      const coverage = (n: number) =>
        `${n}/${rows.length} vendas com dados disponíveis`;
      const panel = emptyPanel();
      panel.metrics = [
        metric(
          "revenue",
          "Receita das vendas",
          report.summary.revenue,
          "money",
          "Vendas válidas confirmadas no período, conforme regra da rentabilidade.",
          { previous: prior.summary.revenue, href: "/rentabilidade" },
        ),
        metric(
          "cost",
          "Custo realizado coberto",
          actualCosts.length
            ? sum(actualCosts.map((s) => s.actual.totalCost.value!)).toFixed(2)
            : null,
          "money",
          "Soma somente dos pedidos com custo realizado disponível.",
          {
            coverage: coverage(actualCosts.length),
            reason: !actualCosts.length
              ? "Nenhuma venda com custo realizado disponível."
              : undefined,
          },
        ),
        metric(
          "expectedCost",
          "Custo previsto coberto",
          expectedCosts.length
            ? sum(
                expectedCosts.map((s) => s.expected.totalCost.value!),
              ).toFixed(2)
            : null,
          "money",
          "Soma somente dos pedidos com custo previsto disponível.",
          {
            coverage: coverage(expectedCosts.length),
            reason: !expectedCosts.length
              ? "Nenhuma venda com custo previsto disponível."
              : undefined,
          },
        ),
        metric(
          "knownCost",
          "Parcelas de custo conhecidas",
          report.summary.knownCost,
          "money",
          "Componentes conhecidos, inclusive em pedidos com custo incompleto. Não equivale ao custo total.",
        ),
        metric(
          "contribution",
          "Contribuição realizada coberta",
          report.summary.actual.value,
          "money",
          "Receita menos custos variáveis, taxas e frete conforme cálculo existente; não é lucro líquido.",
          {
            coverage: coverage(report.summary.actual.count),
            reason:
              report.summary.actual.value === null
                ? "Contribuição indisponível nos pedidos do período."
                : undefined,
          },
        ),
        metric(
          "margin",
          "Margem realizada coberta",
          report.summary.actual.margin,
          "percent",
          "Contribuição / receita apenas dos pedidos com contribuição disponível.",
          {
            coverage: coverage(report.summary.actual.count),
            reason:
              report.summary.actual.margin === null
                ? "Receita coberta nula ou contribuição indisponível."
                : undefined,
          },
        ),
        metric(
          "expectedMargin",
          "Margem prevista coberta",
          report.summary.expected.margin,
          "percent",
          "Margem do cenário previsto para os pedidos cobertos.",
          { coverage: coverage(report.summary.expected.count) },
        ),
        metric(
          "costChange",
          "Desvio de custo",
          report.summary.costChange.value,
          "money",
          "Realizado menos previsto apenas dos pedidos com ambos os custos disponíveis.",
          { coverage: coverage(report.summary.costChange.count) },
        ),
        metric(
          "contributionChange",
          "Desvio de contribuição",
          report.summary.contributionChange.value,
          "money",
          "Realizado menos previsto nos mesmos pedidos cobertos.",
          { coverage: coverage(report.summary.contributionChange.count) },
        ),
        metric(
          "hourly",
          "Resultado por hora de impressão",
          perHour,
          "money",
          "Contribuição por hora medida; somente vendas entregues, custos completos e tempo atribuível.",
          {
            coverage: coverage(eligibleHours.length),
            reason:
              perHour === null
                ? "Sem venda entregue com custo completo e tempo exclusivo medido. Lotes entre vendas e tempo ausente são excluídos."
                : undefined,
          },
        ),
        metric(
          "lowMargin",
          f.margin === undefined
            ? "Pedidos com margem negativa"
            : "Pedidos abaixo da referência",
          low.length,
          "number",
          `Margem realizada inferior a ${numberText(threshold.toFixed())}%. Pedidos sem margem disponível ficam fora.`,
        ),
        metric(
          "complete",
          "Custos completos",
          rows.filter((s) => s.actual.totalCost.coverage === "COMPLETE").length,
          "number",
          "Pedidos com cobertura COMPLETE no custo realizado.",
        ),
      ];
      panel.charts = [
        {
          id: "costs",
          title: "Previsto e realizado por pedido",
          description:
            "Custos disponíveis; ausências não são tratadas como zero. Consulte a cobertura na tabela.",
          kind: "bar",
          unit: "money",
          keys: [
            { key: "expected", label: "Custo previsto" },
            { key: "actual", label: "Custo realizado" },
          ],
          points: rows.slice(0, 20).map((s) => ({
            label: s.number,
            expected: s.expected.totalCost.value,
            actual: s.actual.totalCost.value,
          })),
        },
        statusChart(
          "coverage",
          "Cobertura do custo realizado",
          rows.map((s) => s.actual.totalCost.coverage),
          "Vendas confirmadas no período; custos completos, provisórios, parciais ou indisponíveis.",
        ),
      ];
      panel.tables = [
        {
          id: "products",
          title: "Margem por produto",
          description:
            "Resultado sobre a receita coberta. Sem cobertura integral, não representa todos os pedidos do produto.",
          columns: [
            "Produto",
            "Receita",
            "Contribuição coberta",
            "Margem coberta",
            "Pedidos cobertos",
          ],
          rows: report.products.map((p) => ({
            id: p.id,
            cells: [
              p.name,
              moneyText(p.summary.revenue),
              p.summary.actual.value === null
                ? "Indisponível"
                : moneyText(p.summary.actual.value),
              p.summary.actual.margin === null
                ? "Indisponível"
                : `${numberText(p.summary.actual.margin)}%`,
              `${p.summary.actual.count}/${p.summary.count}`,
            ],
          })),
        },
        {
          id: "sales",
          title: "Resultado por pedido",
          description:
            "Ordenado por menor margem disponível; pedidos sem margem aparecem ao final. Custos e margens seguem a cobertura informada.",
          columns: [
            "Pedido",
            "Receita",
            "Previsto",
            "Realizado",
            "Margem",
            "Cobertura",
            "Resultado/h",
          ],
          rows: [...eligible]
            .sort((a, b) =>
              a.sale.actual.margin.value === null
                ? 1
                : b.sale.actual.margin.value === null
                  ? -1
                  : new D(a.sale.actual.margin.value).cmp(
                      b.sale.actual.margin.value,
                    ),
            )
            .map(({ sale: s, perHour }) => ({
              id: s.saleId,
              cells: [
                s.number,
                moneyText(s.revenue),
                s.expected.totalCost.value === null
                  ? "Indisponível"
                  : moneyText(s.expected.totalCost.value),
                s.actual.totalCost.value === null
                  ? "Indisponível"
                  : moneyText(s.actual.totalCost.value),
                s.actual.margin.value === null
                  ? "Indisponível"
                  : `${numberText(s.actual.margin.value)}%`,
                s.actual.totalCost.coverage,
                perHour === null ? "Indisponível" : moneyText(perHour),
              ],
              href: `/vendas/${s.saleId}`,
            })),
        },
      ];
      panel.priorities = low.map((s) => ({
        id: s.saleId,
        title: `Pedido ${s.number}`,
        detail: `Margem ${numberText(s.actual.margin.value!)}% · ${s.actual.contribution.coverage}`,
        href: `/vendas/${s.saleId}`,
        severity: "urgent",
      }));
      panel.notes = [
        "Rentabilidade usa a primeira confirmação/conversão registrada; Comercial usa a criação da venda. Por isso os totais dos dois painéis podem diferir.",
        "Resultado por hora mede contribuição por hora de impressão, sem pretensão de lucro líquido; horas de lotes compartilhados entre vendas não são atribuídas arbitrariamente.",
        `${candidates.filter((s) => !s.events.length).length} vendas sem data de confirmação não entram nos indicadores por período.`,
      ];
      return panel;
    },
    { isolationLevel: "RepeatableRead", timeout: 60000 },
  );
}
