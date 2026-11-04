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
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { DashboardPanelDTO } from "@/domain/dashboard/types";
import { MetricCard } from "./metric-card";
import { DashboardChart } from "./dashboard-chart";
import { PriorityTable } from "./priority-table";
import { DashboardDataTable } from "./data-table";
export function DashboardPanel({ data }: { data: DashboardPanelDTO }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.slice(0, 4).map((m) => (
          <MetricCard key={m.id} metric={m} />
        ))}
      </div>
      <PriorityTable priorities={data.priorities} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {data.charts.map((s) => (
          <DashboardChart key={s.id} series={s} />
        ))}
      </div>
      {data.metrics.length > 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Mais indicadores da operação</CardTitle>
            <CardDescription>
              Detalhes de desempenho, cobertura e posição atual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible defaultValue="metrics">
              <AccordionItem value="metrics" className="border-0">
                <AccordionTrigger>
                  Consultar {data.metrics.length - 4} indicadores adicionais
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {data.metrics.slice(4).map((m) => (
                      <MetricCard key={m.id} metric={m} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}
      {data.tables.map((t) => (
        <Card key={t.id}>
          <CardHeader>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardDataTable table={t} />
          </CardContent>
        </Card>
      ))}
      {data.notes.length > 0 && (
        <Alert>
          <AlertDescription>
            <ul className="flex list-disc flex-col gap-2 pl-4">
              {data.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
