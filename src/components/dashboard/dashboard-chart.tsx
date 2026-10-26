"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import type { Series } from "@/domain/dashboard/types";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { DashboardDataTable } from "./data-table";
import { dateLabel, formatMetric } from "./format";
export function DashboardChart({ series: s }: { series: Series }) {
  const config = Object.fromEntries(
    s.keys.map((k, i) => [
      k.key,
      { label: k.label, color: `var(--chart-${i + 1})` },
    ]),
  ) satisfies ChartConfig;
  const data = s.points.map((p) =>
    Object.assign(
      { label: dateLabel(p.label), original: p },
      Object.fromEntries(
        s.keys.map((k) => [k.key, p[k.key] === null ? null : Number(p[k.key])]),
      ),
    ),
  );
  const hasData = s.points.some((p) => s.keys.some((k) => p[k.key] !== null));
  const CommonChart = s.kind === "area" ? AreaChart : BarChart;
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{s.title}</CardTitle>
        <CardDescription>{s.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <Empty className="min-h-64">
            <EmptyHeader>
              <EmptyTitle>Sem dados para este gráfico</EmptyTitle>
              <EmptyDescription>
                Não há registros ou valores suficientes nesta seleção.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer
            config={config}
            className="h-64 w-full min-w-0 aspect-auto"
            aria-label={s.title}
          >
            <CommonChart
              accessibilityLayer
              data={data}
              margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)" }}
                minTickGap={30}
                tickFormatter={(v) =>
                  String(v).length > 20
                    ? `${String(v).slice(0, 17)}…`
                    : String(v)
                }
              />
              <YAxis
                width={58}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)" }}
                tickFormatter={(v) =>
                  new Intl.NumberFormat("pt-BR", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(Number(v))
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(_value, name, item) => (
                      <div className="flex flex-wrap gap-3">
                        <span className="text-muted-foreground">
                          {s.keys.find((k) => k.key === name)?.label ??
                            String(name)}
                        </span>
                        <strong>
                          {formatMetric(
                            item.payload?.original?.[String(name)] ?? null,
                            s.unit,
                          )}
                        </strong>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              {s.keys.map((k) =>
                s.kind === "area" ? (
                  <Area
                    key={k.key}
                    dataKey={k.key}
                    type="monotone"
                    fill={`var(--color-${k.key})`}
                    fillOpacity={0.14}
                    stroke={`var(--color-${k.key})`}
                    strokeWidth={2}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ) : (
                  <Bar
                    key={k.key}
                    dataKey={k.key}
                    fill={`var(--color-${k.key})`}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                ),
              )}
            </CommonChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="mt-auto block">
        <Accordion type="single" collapsible>
          <AccordionItem value="values" className="border-0">
            <AccordionTrigger>Consultar valores do gráfico</AccordionTrigger>
            <AccordionContent>
              <DashboardDataTable
                table={{
                  id: s.id,
                  title: s.title,
                  description: s.description,
                  columns: ["Referência", ...s.keys.map((k) => k.label)],
                  rows: s.points.map((p, i) => ({
                    id: String(i),
                    cells: [
                      dateLabel(p.label),
                      ...s.keys.map((k) =>
                        formatMetric(p[k.key] ?? null, s.unit),
                      ),
                    ],
                  })),
                }}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardFooter>
    </Card>
  );
}
