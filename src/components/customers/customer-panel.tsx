"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Page } from "@/domain/shared/pagination";
import type { CustomerDTO } from "@/domain/customers/types";
import { CustomerForm } from "./customer-form";
import { Field } from "@/components/ui/field";
export function CustomerPanel({
  initial,
  search,
  active,
}: {
  initial: Page<CustomerDTO>;
  search: string;
  active: string;
}) {
  const router = useRouter(),
    [editing, setEditing] = useState<CustomerDTO | "new" | null>(null),
    [query, setQuery] = useState(search),
    [state, setState] = useState(active);
  function navigate(page: number) {
    router.push(
      `/clientes?${new URLSearchParams({ search: query, active: state, page: String(page) })}`,
    );
  }
  function filter(e: FormEvent) {
    e.preventDefault();
    navigate(1);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">RELACIONAMENTO COM CLIENTES</div>
          <h1>Clientes</h1>
          <p>Cadastros privados da equipe para orçamentos e vendas.</p>
        </div>
        <button className="button primary" onClick={() => setEditing("new")}>
          Novo cliente
        </button>
      </div>
      {editing ? (
        <CustomerForm
          customer={editing === "new" ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : (
        <>
          <form onSubmit={filter} className="product-toolbar">
            <Field
              label="Buscar cliente"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="field">
              <label htmlFor="customer-active-filter">Situação</label>
              <select
                id="customer-active-filter"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </select>
            </div>
            <button className="button secondary">Buscar</button>
          </form>
          <div className="card table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contato</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {initial.items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <small>{c.document}</small>
                    </td>
                    <td>{c.email || c.phone || "Não informado"}</td>
                    <td>{c.active ? "Ativo" : "Inativo"}</td>
                    <td>
                      <button
                        className="button secondary"
                        onClick={() => setEditing(c)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!initial.items.length && (
              <p className="empty-state">Nenhum cliente encontrado.</p>
            )}
          </div>
          <div className="product-toolbar">
            <span>
              {initial.total} clientes · página {initial.page}
            </span>
            <div className="product-actions">
              <button
                className="button secondary"
                disabled={initial.page <= 1}
                onClick={() => navigate(initial.page - 1)}
              >
                Anterior
              </button>
              <button
                className="button secondary"
                disabled={initial.page * initial.pageSize >= initial.total}
                onClick={() => navigate(initial.page + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
