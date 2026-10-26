import { db } from "@/lib/db";
import type { Actor } from "@/server/auth/session";
import type {
  DashboardFilter,
  DashboardPanelDTO,
} from "@/domain/dashboard/types";
import type { CalendarDTO } from "@/domain/planning/types";
import { expandCalendar } from "@/domain/planning/calendar";
import { shiftDay } from "@/domain/dashboard/filters";
import {
  deliveryPerformance,
  machineCapacity,
  summarizeProduction,
} from "@/domain/dashboard/production";
import {
  D,
  emptyPanel,
  metric,
  civil,
  instantDay,
  dateRange,
  sum,
  statusChart,
  dailySeries,
} from "./shared";

export async function getProductionDashboard(
  _actor: Actor,
  f: DashboardFilter,
): Promise<DashboardPanelDTO> {
  return db.$transaction(
    async (tx) => {
      const [orders, reports, sales, printers, calendars, batches] =
        await Promise.all([
          tx.productionOrder.findMany({
            select: {
              id: true,
              sequence: true,
              status: true,
              dueDate: true,
              lines: {
                select: {
                  id: true,
                  description: true,
                  targetUnits: true,
                  events: {
                    select: {
                      goodUnits: true,
                      canceledUnits: true,
                      kind: true,
                      createdAt: true,
                      effectiveDate: true,
                    },
                  },
                  planningParticipations: {
                    select: {
                      units: true,
                      settledUnits: true,
                      releasedUnits: true,
                      batch: { select: { state: true } },
                    },
                  },
                },
              },
            },
          }),
          tx.productionEvent.findMany({
            where: { kind: "REPORT", effectiveDate: dateRange(f) },
            select: {
              id: true,
              kind: true,
              sourceId: true,
              reprintOf: true,
              goodUnits: true,
              failedUnits: true,
              effectiveDate: true,
              corrections: {
                select: {
                  id: true,
                  kind: true,
                  sourceId: true,
                  reprintOf: true,
                  goodUnits: true,
                  failedUnits: true,
                },
              },
            },
          }),
          tx.sale.findMany({
            where: { status: { notIn: ["RASCUNHO", "CANCELADA"] } },
            select: {
              id: true,
              fulfillmentMode: true,
              sequence: true,
              status: true,
              expectedDeliveryDate: true,
              items: { select: { lineKey: true, quantity: true } },
              productionDeliveries: {
                select: {
                  effectiveDate: true,
                  lines: { select: { lineKey: true, units: true } },
                },
              },
            },
          }),
          tx.printer.findMany({
            where: { active: true },
            select: { id: true, name: true },
          }),
          tx.planningCalendar.findMany({
            select: { id: true, version: true, weekly: true, exceptions: true },
          }),
          tx.planningBatch.findMany({
            where: { state: { notIn: ["DRAFT", "CANCELED", "CLOSED"] } },
            select: {
              id: true,
              printerId: true,
              state: true,
              durationMinutes: true,
              prepareMinutes: true,
              removeMinutes: true,
              remainingMinutes: true,
              remainingAsOf: true,
              milestones: {
                select: { id: true, sourceId: true, kind: true, instant: true },
              },
            },
          }),
        ]);
      const active = orders.filter((o) =>
        ["LIBERADA", "EM_EXECUCAO"].includes(o.status),
      );
      const overdue = active.filter(
        (o) => o.dueDate && civil(o.dueDate) < f.today,
      );
      const stats = summarizeProduction(
        reports.flatMap((r) => [r, ...r.corrections]),
      );
      const deliveries = deliveryPerformance(
        sales
          .filter((s) => s.fulfillmentMode === "U3")
          .map((s) => ({
            due: s.expectedDeliveryDate ? civil(s.expectedDeliveryDate) : null,
            items: s.items.map((i) => ({
              key: i.lineKey ?? "",
              units: i.quantity,
            })),
            deliveries: s.productionDeliveries.flatMap((d) =>
              d.lines.map((l) => ({
                date: civil(d.effectiveDate),
                key: l.lineKey,
                units: l.units,
              })),
            ),
          })),
        f.from,
        f.to,
      );
      const durations = orders
        .filter((o) => o.status === "CONCLUIDA")
        .flatMap((o) => {
          const events = o.lines.flatMap((l) => l.events),
            ends = events
              .filter((e) => e.kind === "COMPLETE")
              .map((e) => e.createdAt.getTime()),
            starts = events
              .filter((e) => e.kind === "REPORT")
              .map((e) => e.createdAt.getTime());
          if (
            !ends.length ||
            !starts.length ||
            !o.lines.every((l) => l.events.some((e) => e.kind === "COMPLETE"))
          )
            return [];
          const end = Math.max(...ends);
          return instantDay(new Date(end)) >= f.from &&
            instantDay(new Date(end)) <= f.to
            ? [(end - Math.min(...starts)) / 86400000]
            : [];
        });
      const unplanned = active
        .flatMap((o) => o.lines)
        .reduce((n, l) => {
          const remaining =
            l.targetUnits -
            l.events.reduce((s, e) => s + e.goodUnits + e.canceledUnits, 0);
          const claimed = l.planningParticipations
            .filter((p) => !["DRAFT", "CANCELED"].includes(p.batch.state))
            .reduce(
              (s, p) => s + p.units - p.settledUnits - p.releasedUnits,
              0,
            );
          return n + Math.max(0, remaining - claimed);
        }, 0);
      const calendarHours = printers.map((p) => {
        const row = calendars.find((c) => c.id === `PRINTER:${p.id}`);
        const available = row
          ? String(
              expandCalendar(
                row as unknown as CalendarDTO,
                `${f.today}T00:00:00-03:00`,
                `${shiftDay(f.today, 30)}T00:00:00-03:00`,
              ).reduce(
                (n, w) => n + (Date.parse(w.end) - Date.parse(w.start)) / 60000,
                0,
              ),
            )
          : null;
        const machineBatches = batches
          .filter((b) => b.printerId === p.id)
          .map((b) => {
            let minutes: string | null = null;
            if (b.state === "AWAITING_REMOVAL")
              minutes = b.removeMinutes.toString();
            else if (b.state === "PRINTING") {
              const replaced = new Set(
                b.milestones.flatMap((m) => (m.sourceId ? [m.sourceId] : [])),
              );
              const start = b.milestones.find(
                (m) => m.kind === "PRINT_START" && !replaced.has(m.id),
              );
              const at = b.remainingAsOf ?? start?.instant;
              const estimate = b.remainingAsOf
                ? b.remainingMinutes
                : b.durationMinutes;
              if (at && estimate !== null) {
                const remaining = new D(estimate.toString()).minus(
                  (Date.now() - at.getTime()) / 60000,
                );
                if (remaining.gt(0))
                  minutes = remaining
                    .plus(b.removeMinutes.toString())
                    .toFixed();
              }
            } else if (b.durationMinutes !== null)
              minutes = new D(b.durationMinutes.toString())
                .plus(b.prepareMinutes.toString())
                .plus(b.removeMinutes.toString())
                .toFixed();
            return { id: b.id, minutes };
          });
        return {
          ...p,
          available,
          ...machineCapacity(machineBatches, available),
          lots: machineBatches.length,
        };
      });
      const panel = emptyPanel();
      panel.metrics = [
        metric(
          "active",
          "Ordens em produção",
          active.length,
          "number",
          "Posição atual: ordens liberadas ou em execução.",
          { href: "/producao" },
        ),
        metric(
          "late",
          "Ordens atrasadas",
          overdue.length,
          "number",
          "Ordens ativas cujo prazo é anterior a hoje.",
        ),
        metric(
          "delivery",
          "Entregas no prazo",
          deliveries.rate,
          "percent",
          `${deliveries.onTime}/${deliveries.count} pedidos U3 integralmente entregues no período, com prazo informado.`,
          {
            reason:
              deliveries.rate === null
                ? "Sem entregas completas com prazo na janela."
                : undefined,
          },
        ),
        metric(
          "duration",
          "Tempo por ordem",
          durations.length
            ? sum(durations).div(durations.length).toFixed(2)
            : null,
          "days",
          "Do primeiro apontamento registrado até a conclusão; não mede horas trabalhadas.",
          {
            coverage: `${durations.length} ordens com início e conclusão registrados`,
            reason: !durations.length
              ? "Sem ordens concluídas com os dois registros no período."
              : undefined,
          },
        ),
        metric(
          "good",
          "Peças aprovadas",
          stats.good,
          "number",
          "Apontamentos do período, com correções aplicadas.",
        ),
        metric(
          "failed",
          "Peças perdidas",
          stats.failed,
          "number",
          "Falhas dos apontamentos do período, com correções.",
        ),
        metric(
          "yield",
          "Aproveitamento",
          stats.yield,
          "percent",
          "Peças boas / (peças boas + falhas).",
          {
            reason:
              stats.yield === null
                ? "Nenhuma peça apontada no período."
                : undefined,
          },
        ),
        metric(
          "reprints",
          "Apontamentos de reimpressão",
          stats.reprints,
          "number",
          "Reimpressões explicitamente vinculadas a uma tentativa anterior.",
        ),
        metric(
          "unplanned",
          "Peças sem programação",
          unplanned,
          "number",
          "Demanda restante de ordens ativas sem participação vigente em lote.",
          { href: "/planejamento" },
        ),
        metric(
          "load",
          "Horas comprometidas",
          calendarHours.every((p) => p.committed !== null)
            ? sum(calendarHours.map((p) => p.committed!)).toFixed(2)
            : null,
          "hours",
          "Fila atual por máquina; cada lote contado uma vez, incluindo preparação e remoção.",
          {
            reason: calendarHours.some((p) => p.committed === null)
              ? "Há lotes sem duração ou término confirmado."
              : undefined,
          },
        ),
        metric(
          "capacity",
          "Capacidade disponível",
          calendarHours.length && calendarHours.every((p) => p.free !== null)
            ? sum(calendarHours.map((p) => p.free!)).toFixed(2)
            : null,
          "hours",
          "Estimativa: calendário dos próximos 30 dias menos fila atual; não garante encaixe contínuo.",
          {
            reason:
              !calendarHours.length ||
              calendarHours.some((p) => p.free === null)
                ? "Configure calendário e duração de todos os lotes para estimar capacidade."
                : undefined,
          },
        ),
      ];
      panel.charts = [
        statusChart(
          "orders",
          "Ordens por etapa",
          orders.map((o) => o.status),
        ),
        {
          id: "load",
          title: "Carga por impressora",
          description:
            "Horas da fila atual; duração desconhecida é omitida, nunca tratada como zero.",
          unit: "hours",
          kind: "bar",
          keys: [{ key: "value", label: "Horas comprometidas" }],
          points: calendarHours.map((p) => ({
            label: p.name,
            value: p.committed,
          })),
        },
        dailySeries(
          "quality",
          "Peças apontadas",
          reports.map((r) => ({
            date: civil(r.effectiveDate),
            value: String(
              r.goodUnits + r.corrections.reduce((n, c) => n + c.goodUnits, 0),
            ),
          })),
          f,
          "number",
        ),
      ];
      panel.tables = [
        {
          id: "capacity",
          title: "Capacidade por máquina",
          description:
            "Horizonte de 30 dias a partir de hoje. Preparação/remoção incluídas na carga; disponibilidade da equipe e encaixe por horário devem ser conferidos em Planejamento.",
          columns: ["Impressora", "Lotes", "Carga (h)", "Livre estimado (h)"],
          rows: calendarHours.map((p) => ({
            id: p.id,
            cells: [
              p.name,
              String(p.lots),
              p.committed ?? "Não informada",
              p.free ?? "Dados insuficientes",
            ],
            href: "/planejamento",
          })),
        },
      ];
      panel.priorities = [...active]
        .filter((o) => o.dueDate)
        .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
        .map((o) => ({
          id: o.id,
          title: `Ordem #${o.sequence}`,
          detail: `Prazo ${civil(o.dueDate!)} · ${o.status.replaceAll("_", " ")}`,
          href: `/producao?status=${o.status}${o.dueDate ? `&dueTo=${civil(o.dueDate)}` : ""}`,
          severity: civil(o.dueDate!) < f.today ? "urgent" : "attention",
        }));
      panel.notes = [
        `${deliveries.withoutDate} entregas completas sem prazo ficaram fora da taxa. Entregas legadas sem linhas de entrega também não compõem a taxa.`,
        "Fila, atrasos e capacidade representam a posição atual. Qualidade usa a data efetiva do apontamento original e incorpora suas correções.",
      ];
      const upcomingSales = sales
        .filter(
          (s) =>
            s.expectedDeliveryDate &&
            civil(s.expectedDeliveryDate) <= shiftDay(f.today, 7) &&
            s.status !== "ENTREGUE",
        )
        .sort(
          (a, b) =>
            a.expectedDeliveryDate!.getTime() -
            b.expectedDeliveryDate!.getTime(),
        );
      panel.metrics.push(
        metric(
          "upcomingSales",
          "Pedidos com entrega próxima",
          upcomingSales.length,
          "number",
          "Vendas ainda não entregues com prazo até os próximos 7 dias, incluindo atrasadas e prontas para entrega.",
          { href: "/vendas" },
        ),
      );
      panel.priorities.push(
        ...upcomingSales.map((s) => ({
          id: `sale-${s.id}`,
          title: `Venda #${s.sequence}`,
          detail: `Entrega ${civil(s.expectedDeliveryDate!)} · ${s.status === "PRONTA" ? "Pronta para entrega" : "Conferir produção e conclusão"}`,
          href: `/vendas/${s.id}`,
          severity:
            civil(s.expectedDeliveryDate!) < f.today
              ? ("urgent" as const)
              : ("attention" as const),
        })),
      );
      return panel;
    },
    { isolationLevel: "RepeatableRead", timeout: 20000 },
  );
}
