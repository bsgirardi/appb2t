"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import type {
  OpportunityDTO,
  OpportunityOptions,
} from "@/domain/opportunities/types";
import type { OpportunityFilter } from "@/domain/opportunities/validation";
import { stageLabels } from "@/domain/opportunities/types";
import { opportunityDueState } from "@/domain/opportunities/states";
import type { Page } from "@/domain/shared/pagination";
import { useRouter } from "next/navigation";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OpportunityForm } from "./form";
export function OpportunityPanel({
  initial,
  filters,
  options,
  actorId,
}: {
  initial: Page<OpportunityDTO>;
  filters: OpportunityFilter;
  options: OpportunityOptions;
  actorId: string;
}) {
  const router = useRouter(),
    [creating, setCreating] = useState(false);
  const href = (page: number) =>
    `/negociacoes?${new URLSearchParams({ ...filters, page: String(page), pageSize: String(filters.pageSize) }).toString()}`;
  function filter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push(
      `/negociacoes?${new URLSearchParams(new FormData(e.currentTarget) as never)}`,
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Negociações</h1>
          <p>Próximos contatos e oportunidades da equipe.</p>
        </div>
        <Button onClick={() => setCreating(true)}>Nova oportunidade</Button>
      </div>
      {creating ? (
        <Card>
          <CardHeader>
            <CardTitle>Nova oportunidade</CardTitle>
            <CardDescription>
              Comece pelo cliente, responsável e próxima ação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OpportunityForm
              options={{
                ...options,
                owners: [...options.owners].sort(
                  (a, b) => Number(b.id === actorId) - Number(a.id === actorId),
                ),
              }}
              onSaved={(o) => router.push(`/negociacoes/${o.id}`)}
              onCancel={() => setCreating(false)}
            />
          </CardContent>
        </Card>
      ) : null}
      <form onSubmit={filter}>
        <FieldGroup className="md:grid md:grid-cols-4 md:items-end">
          <Field
            label="Buscar negociação"
            name="search"
            defaultValue={filters.search}
            maxLength={160}
          />
          <div data-slot="field">
            <Label htmlFor="op-owner">Responsável</Label>
            <NativeSelect
              id="op-owner"
              name="owner"
              defaultValue={filters.owner}
            >
              <option value="todos">Todos</option>
              <option value="eu">Eu</option>
              {options.owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div data-slot="field">
            <Label htmlFor="op-stage">Etapa</Label>
            <NativeSelect
              id="op-stage"
              name="stage"
              defaultValue={filters.stage}
            >
              <option value="abertas">Abertas</option>
              <option value="todas">Todas</option>
              {Object.entries(stageLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div data-slot="field">
            <Label htmlFor="op-due">Próxima ação</Label>
            <NativeSelect id="op-due" name="due" defaultValue={filters.due}>
              <option value="todas">Todas as datas</option>
              <option value="atrasadas">Atrasadas</option>
              <option value="hoje">Hoje</option>
            </NativeSelect>
          </div>
          <Button type="submit" variant="outline">
            Filtrar negociações
          </Button>
        </FieldGroup>
      </form>
      <p>{initial.total} oportunidade(s)</p>
      <div className="grid gap-3 lg:grid-cols-2">
        {initial.items.map((o) => (
          <Card key={o.id}>
            <CardHeader>
              <CardTitle className="break-words">
                <Link href={`/negociacoes/${o.id}`}>{o.title}</Link>
              </CardTitle>
              <CardDescription>
                {o.customer.name} · {o.owner.name}
                {!o.owner.active ? " (responsável inativo)" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{stageLabels[o.stage]}</Badge>
                {o.nextContactDate ? (
                  <Badge
                    variant={
                      opportunityDueState(
                        o.nextContactDate,
                        todaySaoPaulo(new Date()),
                      ) === "atrasada"
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {o.nextContactDate.split("-").reverse().join("/")}
                    {opportunityDueState(
                      o.nextContactDate,
                      todaySaoPaulo(new Date()),
                    ) === "atrasada"
                      ? " · Atrasada"
                      : ""}
                  </Badge>
                ) : null}
              </div>
              <p className="break-words">
                {o.nextAction ?? "Oportunidade encerrada"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      {!initial.items.length ? (
        <p>Nenhuma oportunidade para os filtros selecionados.</p>
      ) : null}
      <nav
        aria-label="Páginas de negociações"
        className="flex flex-wrap items-center gap-3"
      >
        {initial.page > 1 ? (
          <Button asChild variant="outline">
            <Link href={href(initial.page - 1)}>Anterior</Link>
          </Button>
        ) : null}
        <span>Página {initial.page}</span>
        {initial.page * initial.pageSize < initial.total ? (
          <Button asChild variant="outline">
            <Link href={href(initial.page + 1)}>Próxima</Link>
          </Button>
        ) : null}
      </nav>
    </div>
  );
}
