import { db } from "@/lib/db";
import type { Actor } from "@/server/auth/session";
import type {
  DashboardFilter,
  DashboardPanelDTO,
} from "@/domain/dashboard/types";
import { getCommercialDashboard } from "./commercial";
import { getFinancialDashboard } from "./finance";
import { metric, statusChart, civil } from "./shared";
import { shiftDay } from "@/domain/dashboard/filters";
export async function getOverviewDashboard(
  actor: Actor,
  f: DashboardFilter,
): Promise<DashboardPanelDTO> {
  const [commercial, finance, production] = await Promise.all([
    getCommercialDashboard(actor, f),
    actor.role === "ADMIN"
      ? getFinancialDashboard(actor, f)
      : Promise.resolve(null),
    db.productionOrder.findMany({
      where: { status: { in: ["LIBERADA", "EM_EXECUCAO"] } },
      select: { id: true, sequence: true, status: true, dueDate: true },
    }),
  ]);
  const overdue = production.filter(
    (o) => o.dueDate && civil(o.dueDate) < f.today,
  );
  return {
    metrics: [
      commercial.metrics.find((m) => m.id === "sales")!,
      commercial.metrics.find((m) => m.id === "backlog")!,
      metric(
        "production",
        "Ordens em produção",
        production.length,
        "number",
        "Posição atual: ordens liberadas e em execução.",
        { href: "/producao" },
      ),
      metric(
        "overdue",
        "Ordens atrasadas",
        overdue.length,
        "number",
        "Ordens ativas com prazo vencido.",
        { href: `/producao?dueTo=${shiftDay(f.today, -1)}` },
      ),
      commercial.metrics.find((m) => m.id === "quotes")!,
      commercial.metrics.find((m) => m.id === "pendingSales")!,
      commercial.metrics.find((m) => m.id === "ready")!,
      ...(finance
        ? finance.metrics.filter((m) =>
            ["balance", "receivable", "payable", "minimum"].includes(m.id),
          )
        : []),
    ],
    charts: [
      commercial.charts.find((c) => c.id === "sales")!,
      statusChart(
        "production",
        "Produção em andamento",
        production.map((o) => o.status),
      ),
    ],
    priorities: [
      ...overdue
        .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
        .map((o) => ({
          id: o.id,
          title: `Ordem #${o.sequence} atrasada`,
          detail: `Prazo ${civil(o.dueDate!)}`,
          href: `/producao?status=${o.status}&dueTo=${shiftDay(f.today, -1)}`,
          severity: "urgent" as const,
        })),
      ...commercial.priorities,
      ...(finance?.priorities ?? []),
    ].sort(
      (a, b) =>
        (a.severity === "urgent" ? 0 : 1) - (b.severity === "urgent" ? 0 : 1),
    ),
    tables: commercial.tables,
    notes: [
      "A visão geral reúne oportunidades, produção, artes e vencimentos. Estoque, capacidade detalhada e margens estão nos painéis específicos.",
      ...commercial.notes,
    ],
  };
}
