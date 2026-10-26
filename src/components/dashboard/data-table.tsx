"use client";
import { useState } from "react";
import Link from "next/link";
import type { DataTable } from "@/domain/dashboard/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
export function DashboardDataTable({ table }: { table: DataTable }) {
  const [page, setPage] = useState(0),
    pages = Math.ceil(table.rows.length / 10),
    current = Math.min(page, Math.max(0, pages - 1));
  if (!table.rows.length)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Sem registros nesta seleção</EmptyTitle>
          <EmptyDescription>
            Experimente outro período ou confira os dados da operação.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            {table.columns.map((c) => (
              <TableHead key={c}>{c}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.slice(current * 10, current * 10 + 10).map((row) => (
            <TableRow key={row.id}>
              {row.cells.map((cell, i) => (
                <TableCell key={i}>
                  {i === 0 && row.href ? (
                    <Button
                      asChild
                      variant="link"
                      size="sm"
                      className="justify-start px-0"
                    >
                      <Link href={row.href}>{cell}</Link>
                    </Button>
                  ) : (
                    cell
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted-foreground">
          {table.rows.length} registros
          {pages > 1 ? ` · página ${current + 1} de ${pages}` : ""}
        </span>
        {pages > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label={`Página anterior: ${table.title}`}
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label={`Próxima página: ${table.title}`}
              disabled={current + 1 >= pages}
              onClick={() => setPage(current + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
