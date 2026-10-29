import Link from "next/link";
import { Suspense } from "react";
import { requireActor } from "@/server/auth/guards";
import { getDashboardPanel } from "@/server/dashboard/panels";
import { resolveDashboardFilter } from "@/domain/dashboard/filters";
import {
  dashboardPanels,
  permittedPanels,
  type DashboardFilter,
} from "@/domain/dashboard/types";
import type { Actor } from "@/server/auth/session";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { dateLabel } from "@/components/dashboard/format";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AppError } from "@/lib/errors";
import DashboardLoading from "./loading";
async function Panel({
  actor,
  filter,
}: {
  actor: Actor;
  filter: DashboardFilter;
}) {
  const data = await getDashboardPanel(actor, filter);
  return <DashboardPanel data={data} />;
}
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  let filter: DashboardFilter;
  try {
    filter = resolveDashboardFilter(await searchParams, actor.role);
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    return (
      <section className="flex flex-col gap-4">
        <h1>Dashboard</h1>
        <Alert variant="destructive" role="alert">
          {error.message}
        </Alert>
        <Button asChild variant="outline">
          <Link href="/dashboard">Voltar à visão geral</Link>
        </Button>
      </section>
    );
  }
  const selected = dashboardPanels.find((p) => p.id === filter.panel)!;
  return (
    <section className="dashboard-workspace flex min-w-0 flex-col gap-6">
      <div className="page-heading mb-0">
        <div>
          <h1>{selected.label}</h1>
          <p>{selected.description}</p>
        </div>
        <p className="text-muted-foreground">
          Atualizado em {dateLabel(filter.today)}
        </p>
      </div>
      <DashboardToolbar
        key={`toolbar-${JSON.stringify(filter)}`}
        filter={filter}
        panels={permittedPanels(actor.role)}
      />
      <p className="text-muted-foreground">
        Período: {dateLabel(filter.from)} a {dateLabel(filter.to)}. Comparações
        com {dateLabel(filter.previousFrom)} a {dateLabel(filter.previousTo)}.
        Posições atuais identificadas em cada indicador.
      </p>
      <Suspense
        key={`panel-${JSON.stringify(filter)}`}
        fallback={<DashboardLoading />}
      >
        <Panel actor={actor} filter={filter} />
      </Suspense>
    </section>
  );
}
