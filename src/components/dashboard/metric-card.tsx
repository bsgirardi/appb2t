import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Metric } from "@/domain/dashboard/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMetric, metricChange } from "./format";
export function MetricCard({ metric: m }: { metric: Metric }) {
  const change = metricChange(m.value, m.previous);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>{m.label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <strong
          className="dashboard-stat"
          data-unavailable={m.value === null || undefined}
        >
          {formatMetric(m.value, m.unit)}
        </strong>
        {change && (
          <Badge variant="outline" className="w-fit">
            {change} em relação ao período anterior
          </Badge>
        )}
        {m.coverage && (
          <Badge variant="secondary" className="w-fit">
            {m.coverage}
          </Badge>
        )}
        {m.reason && <p className="text-muted-foreground">{m.reason}</p>}
      </CardContent>
      <CardFooter className="mt-auto flex-col items-start gap-2">
        <CardDescription>{m.description}</CardDescription>
        {m.previous !== undefined && (
          <p className="text-muted-foreground">
            Anterior: {formatMetric(m.previous, m.unit)}
          </p>
        )}
        {m.href && (
          <Button
            asChild
            variant="link"
            size="sm"
            className="justify-start px-0"
          >
            <Link href={m.href}>
              Abrir operação
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
