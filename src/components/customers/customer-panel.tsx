"use client";
import { FilterPanel } from "@/components/admin/filter-panel";
import { ContextEditor } from "@/components/admin/context-editor";
import { RelationshipCriteria } from "@/components/commerce/relationship-criteria";

import { AdminForm } from "@/components/admin/admin-form";
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
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
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
    [state, setState] = useState(active),
    [applied, setApplied] = useState({ search, active });
  if (applied.search !== search || applied.active !== active) {
    setApplied({ search, active });
    setQuery(search);
    setState(active);
  }
  const filtered = !!search || (!!active && active !== "all");
  function navigate(page: number) {
    router.push(
      `/clientes?${new URLSearchParams({ search, active, page: String(page) })}`,
    );
  }
  function filter(e: FormEvent) {
    e.preventDefault();
    router.push(
      `/clientes?${new URLSearchParams({ search: query.trim(), active: state, page: "1" })}`,
    );
  }
  return (
    <div className="commerce-page relationship-reading">
      <div className="page-heading">
        <div>
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
      <ContextEditor
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={editing === "new" ? "Novo cliente" : "Editar cliente"}
      >
        {editing && (
          <CustomerForm
            customer={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        )}
      </ContextEditor>
      <>
        <FilterPanel
          activeCount={Number(!!search) + Number(!!active && active !== "all")}
        >
          <AdminForm
            requiredGuide={false}
            onSubmit={filter}
            className="product-toolbar"
          >
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
              Aplicar filtros
            </Button>
          </AdminForm>
        </FilterPanel>
        <RelationshipCriteria
          criteria={[
            ...(search ? [`Busca: ${search}`] : []),
            ...(active === "true"
              ? ["Situação: Ativos"]
              : active === "false"
                ? ["Situação: Inativos"]
                : []),
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground" role="status">
            {initial.total} clientes
            {filtered ? " nesta seleção" : " cadastrados"}
          </p>
          {filtered && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/clientes")}
            >
              Limpar filtros
            </Button>
          )}
        </div>
        <Card asChild>
          <div
            className="table-scroll"
            role="region"
            aria-label="Lista de clientes"
          >
            {initial.items.length > 0 && (
              <Table aria-label="Clientes cadastrados">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Cliente</TableHead>
                    <TableHead scope="col">Contatos cadastrados</TableHead>
                    <TableHead scope="col">Situação</TableHead>
                    <TableHead scope="col">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initial.items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <strong>{c.name}</strong>
                          <span className="text-muted-foreground">
                            {c.document || "Documento não informado"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <dl className="relationship-contacts">
                          <div>
                            <dt>E-mail</dt>
                            <dd>{c.email || "Não informado"}</dd>
                          </div>
                          <div>
                            <dt>Telefone</dt>
                            <dd>{c.phone || "Não informado"}</dd>
                          </div>
                        </dl>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.active ? "secondary" : "outline"}>
                          {c.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className=""
                          onClick={() => setEditing(c)}
                          aria-label={`Editar cliente: ${c.name}`}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!initial.items.length && (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>
                    {initial.total > 0
                      ? "Nenhum cliente nesta página"
                      : filtered
                        ? "Nenhum cliente nesta seleção"
                        : "Nenhum cliente cadastrado"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {initial.total > 0
                      ? "Os resultados mudaram. Volte à primeira página para continuar."
                      : filtered
                        ? "Ajuste a busca ou a situação para encontrar outros clientes."
                        : "Cadastre o primeiro cliente para preparar orçamentos e vendas."}
                  </EmptyDescription>
                </EmptyHeader>
                {initial.total > 0 && (
                  <EmptyContent>
                    <Button onClick={() => navigate(1)}>
                      Voltar à primeira página
                    </Button>
                  </EmptyContent>
                )}
                {!filtered && initial.total === 0 && (
                  <EmptyContent>
                    <Button onClick={() => setEditing("new")}>
                      Cadastrar primeiro cliente
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
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
    </div>
  );
}
