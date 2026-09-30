"use client";
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
    <div className="commerce-page">
      <div className="page-heading">
        <div>
          <h1>Orçamentos</h1>
          <p>Prepare propostas e acompanhe a aprovação do cliente.</p>
        </div>
        <button className="button primary" onClick={() => setCreating(true)}>
          Novo orçamento
        </button>
      </div>
      {creating && (
        <QuoteForm
          customers={customers}
          products={products}
          onCancel={() => setCreating(false)}
          onSaved={(q) => router.push(`/orcamentos/${q.id}`)}
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
              "ENVIADO",
              "APROVADO",
              "REJEITADO",
              "EXPIRADO",
              "CONVERTIDO",
            ].map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "Todos" : s}
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
              <th>Orçamento</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {initial.items.map((q) => (
              <tr key={q.id}>
                <td>
                  <Link href={`/orcamentos/${q.id}`}>{q.number}</Link>
                </td>
                <td>
                  {q.snapshot?.customer.name ??
                    customers.find((c) => c.id === q.input.customerId)?.name ??
                    "Não informado"}
                </td>
                <td>{q.status}</td>
                <td>R$ {q.totals?.total ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!initial.total && <p>Nenhum orçamento encontrado.</p>}
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
          {initial.total} orçamento(s) · Página {initial.page}
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
