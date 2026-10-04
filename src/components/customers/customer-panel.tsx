"use client";
import { Pagination } from "@/components/ui/pagination";
import { Label } from "@/components/ui/label";
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
        <Button
          variant="default"
          size="sm"
          className=""
          onClick={() => setEditing("new")}
        >
          Novo cliente
        </Button>
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
              <Label htmlFor="customer-active-filter">Situação</Label>
              <NativeSelect
                id="customer-active-filter"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </NativeSelect>
            </div>
            <Button variant="outline" size="sm" className="">
              Buscar
            </Button>
          </form>
          <Card asChild>
            <div className="table-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initial.items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <strong>{c.name}</strong>
                        <small>{c.document}</small>
                      </TableCell>
                      <TableCell>
                        {c.email || c.phone || "Não informado"}
                      </TableCell>
                      <TableCell>{c.active ? "Ativo" : "Inativo"}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className=""
                          onClick={() => setEditing(c)}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!initial.items.length && (
                <p className="empty-state">Nenhum cliente encontrado.</p>
              )}
            </div>
          </Card>
          <Pagination className="product-toolbar">
            <span>
              {initial.total} clientes · página {initial.page}
            </span>
            <div className="product-actions">
              <Button
                variant="outline"
                size="sm"
                className=""
                disabled={initial.page <= 1}
                onClick={() => navigate(initial.page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className=""
                disabled={initial.page * initial.pageSize >= initial.total}
                onClick={() => navigate(initial.page + 1)}
              >
                Próxima
              </Button>
            </div>
          </Pagination>
        </>
      )}
    </>
  );
}
