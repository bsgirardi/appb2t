"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ListChecks } from "lucide-react";
import type { Priority } from "@/domain/dashboard/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  TableHeader,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
export function PriorityTable({
  priorities,
  context,
}: {
  priorities: Priority[];
  context?: string;
}) {
  const [page, setPage] = useState(0),
    pages = Math.ceil(priorities.length / 8),
    current = Math.min(page, Math.max(0, pages - 1));
  const sorted = [...priorities].sort(
    (a, b) =>
      (a.severity === "urgent" ? 0 : a.severity === "attention" ? 1 : 2) -
      (b.severity === "urgent" ? 0 : b.severity === "attention" ? 1 : 2),
  );
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>O que precisa de atenção</CardTitle>
          <Badge variant="outline">{priorities.length} pendências</Badge>
        </div>
        <CardDescription>
          Prazos, aprovações e próximos passos da operação. Urgências aparecem
          primeiro.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        {context && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                Critérios e cobertura comercial
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-3 pt-3">
              <p className="text-muted-foreground">{context}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/negociacoes">Consultar negociações</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/orcamentos">Consultar orçamentos</Link>
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        {!priorities.length ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListChecks />
              </EmptyMedia>
              <EmptyTitle>Nenhuma pendência nesta seleção</EmptyTitle>
              <EmptyDescription>
                As prioridades aparecerão aqui quando houver registros que
                precisem de acompanhamento.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prioridade</TableHead>
                <TableHead>Registro e próxima ação</TableHead>
                <TableHead>
                  <span className="sr-only">Acesso</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.slice(current * 8, current * 8 + 8).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Badge
                      variant={
                        p.severity === "urgent" ? "destructive" : "secondary"
                      }
                    >
                      {p.severity === "urgent"
                        ? "Urgente"
                        : p.severity === "attention"
                          ? "Acompanhar"
                          : "Informação"}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-48 whitespace-normal">
                    <div className="flex flex-col gap-1 break-words">
                      <strong>{p.title}</strong>
                      <span className="text-muted-foreground">{p.detail}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={p.href}
                        aria-label={`Abrir operação: ${p.title}`}
                      >
                        Abrir
                        <ArrowUpRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {pages > 1 && (
        <CardFooter className="justify-between">
          <span>
            Página {current + 1} de {pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="Página anterior de prioridades"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Próxima página de prioridades"
              disabled={current + 1 >= pages}
              onClick={() => setPage(current + 1)}
            >
              Próxima
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
