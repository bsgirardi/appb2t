"use client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
        <Button
          variant="outline"
          size="sm"
          className=""
          onClick={() => setEditing("new")}
        >
          Nova categoria
        </Button>
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
            <Label className="field">
              Nome
              <Input
                name="name"
                required
                minLength={2}
                maxLength={100}
                defaultValue={current?.name}
              />
            </Label>
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
      <Card asChild>
        <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>
                    {c.kind === "REVENUE" ? "Receita" : "Despesa"}
                  </TableCell>
                  <TableCell>{c.active ? "Ativa" : "Inativa"}</TableCell>
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
        </div>
      </Card>
    </section>
  );
}
