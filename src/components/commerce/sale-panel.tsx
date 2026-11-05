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
import { Card } from "@/components/ui/card";
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
import type { SaleDTO } from "@/domain/commerce/types";
import type { CustomerDTO } from "@/domain/customers/types";
import { SaleForm } from "./sale-form";
import type { CommercialProduct } from "./document-items";
export function SalePanel({
  initial,
  customers,
  products,
  filters,
}: {
  initial: Page<SaleDTO>;
  customers: CustomerDTO[];
  products: CommercialProduct[];
  filters: {
    search: string;
    status: string;
    customerId?: string;
    from?: string;
    to?: string;
  };
}) {
  const router = useRouter(),
    [creating, setCreating] = useState(false);
  function url(page: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    params.set("page", String(page));
    return `/vendas?${params}`;
  }
  function filter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(e.currentTarget))
      if (typeof v === "string" && v) params.set(k, v);
    router.push(`/vendas?${params}`);
  }
  return (
    <div className="commerce-page">
      <div className="page-heading">
        <div>
          <h1>Vendas</h1>
          <p>Do pedido à produção e entrega.</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className=""
          onClick={() => setCreating(true)}
        >
          Nova venda
        </Button>
      </div>
      {creating && (
        <SaleForm
          customers={customers}
          products={products}
          onCancel={() => setCreating(false)}
          onSaved={(s) => router.push(`/vendas/${s.id}`)}
        />
      )}
      <FilterPanel activeCount={activeCommerceFilters(filters)}>
        <AdminForm
          key={JSON.stringify(filters)}
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
                "realizadas",
                "RASCUNHO",
                "CONFIRMADA",
                "EM_PRODUCAO",
                "PRONTA",
                "ENTREGUE",
                "CANCELADA",
              ].map((s) => (
                <option key={s} value={s}>
                  {s === "all"
                    ? "Todos"
                    : s === "realizadas"
                      ? "Vendas efetivadas"
                      : commerceStatusLabel(s)}
                </option>
              ))}
            </NativeSelect>
          </Label>
          <Label>
            Cliente
            <NativeSelect
              name="customerId"
              defaultValue={filters.customerId ?? ""}
            >
              <option value="">Todos</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
          <Button variant="outline" size="sm" className="">
            Filtrar
          </Button>
          {activeCommerceFilters(filters) > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/vendas")}
            >
              Limpar filtros
            </Button>
          )}
        </AdminForm>
      </FilterPanel>
      <Card asChild>
        <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venda</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pendente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initial.items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/vendas/${s.id}`}>{s.number}</Link>
                  </TableCell>
                  <TableCell>
                    {s.snapshot?.customer.name ??
                      customers.find((c) => c.id === s.document.customerId)
                        ?.name}
                  </TableCell>
                  <TableCell>
                    <CommerceStatus status={s.status} />
                  </TableCell>
                  <TableCell>R$ {s.totals.total}</TableCell>
                  <TableCell>R$ {s.receiptSummary.pending}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!initial.items.length && (
            <ListFeedback
              total={initial.total}
              filtered={activeCommerceFilters(filters) > 0}
              noun="vendas"
              onFirst={() => router.push(url(1))}
              onClear={() => router.push("/vendas")}
            />
          )}
        </div>
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
          {initial.total} venda(s) · Página {initial.page} de{" "}
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
