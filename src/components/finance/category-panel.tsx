"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryDTO } from "@/domain/finance/types";
import { api } from "@/lib/client-api";
import { ActionForm, Select } from "./shared";
export function CategoryPanel({ categories }: { categories: CategoryDTO[] }) {
  const router = useRouter(),
    [editing, setEditing] = useState<CategoryDTO | "new" | null>(null);
  const current = editing && editing !== "new" ? editing : undefined;
  return (
    <section>
      <div className="page-heading">
        <h2>Categorias</h2>
        <button className="button secondary" onClick={() => setEditing("new")}>
          Nova categoria
        </button>
      </div>
      {editing && (
        <ActionForm
          key={current?.id ?? "new"}
          title={current ? "Editar categoria" : "Nova categoria"}
          onCancel={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
          onSubmit={(data) =>
            api(
              `/api/finance/categories${current ? `/${current.id}` : ""}`,
              {
                name: data.get("name"),
                kind: data.get("kind"),
                active: data.get("active") === "true",
                ...(current ? { expectedVersion: current.version } : {}),
              },
              current ? "PUT" : "POST",
            )
          }
        >
          <div className="form-grid">
            <label className="field">
              Nome
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                defaultValue={current?.name}
              />
            </label>
            <Select
              name="kind"
              label="Tipo"
              value={current?.kind ?? "REVENUE"}
              options={[
                { value: "REVENUE", label: "Receita" },
                { value: "EXPENSE", label: "Despesa" },
              ]}
            />
            <Select
              name="active"
              label="Situação"
              value={String(current?.active ?? true)}
              options={
                current?.systemCode
                  ? [{ value: "true", label: "Ativa (categoria de vendas)" }]
                  : [
                      { value: "true", label: "Ativa" },
                      { value: "false", label: "Inativa" },
                    ]
              }
            />
          </div>
          {current?.systemCode && (
            <p>A categoria de vendas permanece ativa e do tipo receita.</p>
          )}
        </ActionForm>
      )}
      <div className="card table-scroll">
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Tipo</th>
              <th>Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.kind === "REVENUE" ? "Receita" : "Despesa"}</td>
                <td>{c.active ? "Ativa" : "Inativa"}</td>
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
      </div>
    </section>
  );
}
