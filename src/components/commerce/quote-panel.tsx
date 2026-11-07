"use client";
import {
  activeCommerceFilters,
  commerceStatusLabel,
  CommerceStatus,
  ListFeedback,
} from "./list-feedback";
import { FilterPanel } from "@/components/admin/filter-panel";
import { AdminForm } from "@/components/admin/admin-form";
import { Pagination } from "@/components/ui/pagination";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { AppliedListFilters } from "./applied-list-filters";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Page } from "@/domain/shared/pagination";
import type { QuoteDTO } from "@/domain/commerce/types";
import type { CustomerDTO } from "@/domain/customers/types";
import { QuoteForm } from "./quote-form";
import type { CommercialProduct } from "./document-items";
export function QuotePanel({
  initial,
  customers,
  products,
  filters,
}: {
  initial: Page<QuoteDTO>;
  customers: CustomerDTO[];
  products: CommercialProduct[];
  filters: { search: string; status: string; from?: string; to?: string };
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  function url(page: number) {
    return `/orcamentos?${new URLSearchParams({ ...(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined)) as Record<string, string>), page: String(page) })}`;
  }
  function filter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push(
      `/orcamentos?${new URLSearchParams(new FormData(e.currentTarget) as never)}`,
    );
  }
  return (
    <div className="commerce-page commercial-list">
      <div className="page-heading">
        <div>
          <h1>Orçamentos</h1>
          <p>Prepare propostas e acompanhe a aprovação do cliente.</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className=""
          onClick={() => setCreating(true)}
        >
          Novo orçamento
        </Button>
      </div>
      {creating && (
        <QuoteForm
          customers={customers}
          products={products}
          onCancel={() => setCreating(false)}
          onSaved={(q) => router.push(`/orcamentos/${q.id}`)}
        />
      )}
      <FilterPanel activeCount={activeCommerceFilters(filters)}>
        <AdminForm
          key={JSON.stringify(filters)}
          requiredGuide={false}
          method="get"
          action="/orcamentos"
          className="commerce-filters"
          onSubmit={filter}
        >
          <Label>
            Buscar
            <Input
              name="search"
              defaultValue={filters.search}
              placeholder="Número ou cliente"
            />
          </Label>
          <Label>
            Estado
            <NativeSelect name="status" defaultValue={filters.status}>
              {[
                "all",
                "RASCUNHO",
                "ENVIADO",
                "APROVADO",
                "REJEITADO",
                "EXPIRADO",
                "CONVERTIDO",
              ].map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "Todos" : commerceStatusLabel(s)}
                </option>
              ))}
            </NativeSelect>
          </Label>
          <Label>
            De
            <Input type="date" name="from" defaultValue={filters.from} />
          </Label>
          <Label>
            Até
            <Input type="date" name="to" defaultValue={filters.to} />
          </Label>
          <Button type="submit" size="sm">
            Aplicar filtros
          </Button>
          {activeCommerceFilters(filters) > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/orcamentos")}
            >
              Limpar filtros
            </Button>
          )}
        </AdminForm>
      </FilterPanel>
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>
            {initial.total} orçamentos encontrados · {initial.items.length}{" "}
            nesta página
          </CardDescription>
          <AppliedListFilters filters={filters} />
        </CardHeader>
        <CardContent>
          {initial.items.length > 0 && (
            <Table aria-label="Lista de orçamentos">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Orçamento</TableHead>
                  <TableHead scope="col">Cliente</TableHead>
                  <TableHead scope="col">Estado</TableHead>
                  <TableHead
                    scope="col"
                    className="commercial-amount text-right"
                  >
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initial.items.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Link
                        className="commercial-document-link"
                        href={`/orcamentos/${q.id}`}
                      >
                        {q.number}
                      </Link>
                    </TableCell>
                    <TableCell className="commercial-customer">
                      {q.snapshot?.customer.name ??
                        customers.find((c) => c.id === q.input.customerId)
                          ?.name ??
                        "Não informado"}
                    </TableCell>
                    <TableCell>
                      <CommerceStatus status={q.status} />
                    </TableCell>
                    <TableCell className="commercial-amount">
                      R$ {q.totals?.total ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!initial.items.length && (
            <ListFeedback
              total={initial.total}
              filtered={activeCommerceFilters(filters) > 0}
              noun="orçamentos"
              onFirst={() => router.push(url(1))}
              onClear={() => router.push("/orcamentos")}
            />
          )}
        </CardContent>
      </Card>
      <Pagination className="form-actions">
        <Button
          variant="outline"
          size="sm"
          className=""
          disabled={initial.page <= 1}
          onClick={() => router.push(url(initial.page - 1))}
        >
          Anterior
        </Button>
        <span>
          {initial.total} orçamento(s) · Página {initial.page} de{" "}
          {Math.max(1, Math.ceil(initial.total / initial.pageSize))}
        </span>
        <Button
          variant="outline"
          size="sm"
          className=""
          disabled={initial.page * initial.pageSize >= initial.total}
          onClick={() => router.push(url(initial.page + 1))}
        >
          Próxima
        </Button>
      </Pagination>
    </div>
  );
}
