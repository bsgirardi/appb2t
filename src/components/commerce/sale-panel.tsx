"use client";
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
        <button className="button primary" onClick={() => setCreating(true)}>
          Nova venda
        </button>
      </div>
      {creating && (
        <SaleForm
          customers={customers}
          products={products}
          onCancel={() => setCreating(false)}
          onSaved={(s) => router.push(`/vendas/${s.id}`)}
        />
      )}
      <form className="commerce-filters" onSubmit={filter}>
        <label>
          Buscar
          <input
            name="search"
            defaultValue={filters.search}
            placeholder="Número ou cliente"
          />
        </label>
        <label>
          Estado
          <select name="status" defaultValue={filters.status}>
            {[
              "all",
              "RASCUNHO",
              "CONFIRMADA",
              "EM_PRODUCAO",
              "PRONTA",
              "ENTREGUE",
              "CANCELADA",
            ].map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "Todos" : s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cliente
          <select name="customerId" defaultValue={filters.customerId ?? ""}>
            <option value="">Todos</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          De
          <input type="date" name="from" defaultValue={filters.from} />
        </label>
        <label>
          Até
          <input type="date" name="to" defaultValue={filters.to} />
        </label>
        <button className="button secondary">Filtrar</button>
      </form>
      <div className="card table-scroll">
        <table>
          <thead>
            <tr>
              <th>Venda</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Pendente</th>
            </tr>
          </thead>
          <tbody>
            {initial.items.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`/vendas/${s.id}`}>{s.number}</Link>
                </td>
                <td>
                  {s.snapshot?.customer.name ??
                    customers.find((c) => c.id === s.document.customerId)?.name}
                </td>
                <td>{s.status}</td>
                <td>R$ {s.totals.total}</td>
                <td>R$ {s.receiptSummary.pending}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!initial.total && <p>Nenhuma venda encontrada.</p>}
      </div>
      <div className="form-actions">
        <button
          className="button secondary"
          disabled={initial.page <= 1}
          onClick={() => router.push(url(initial.page - 1))}
        >
          Anterior
        </button>
        <span>
          {initial.total} venda(s) · Página {initial.page}
        </span>
        <button
          className="button secondary"
          disabled={initial.page * initial.pageSize >= initial.total}
          onClick={() => router.push(url(initial.page + 1))}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
