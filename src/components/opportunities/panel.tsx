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
import { FilterPanel } from "@/components/admin/filter-panel";
import { RelationshipCriteria } from "@/components/commerce/relationship-criteria";
import { commerceStatusLabel } from "@/components/commerce/list-feedback";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
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
    <div className="commerce-page relationship-reading">
      <div className="page-heading">
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
      <FilterPanel
        activeCount={
          [
            filters.search,
            filters.owner !== "todos" && filters.owner,
            filters.stage !== "abertas" && filters.stage,
            filters.due !== "todas" && filters.due,
          ].filter(Boolean).length
        }
      >
        <form key={JSON.stringify(filters)} onSubmit={filter}>
          <FieldGroup className="admin-filter-grid grid">
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
      </FilterPanel>
      <RelationshipCriteria
        criteria={[
          ...(filters.search ? [`Busca: ${filters.search}`] : []),
          `Etapa: ${filters.stage === "abertas" ? "Abertas" : filters.stage === "todas" ? "Todas" : stageLabels[filters.stage]}`,
          ...(filters.owner !== "todos"
            ? [
                `Responsável: ${filters.owner === "eu" ? "Eu" : (options.owners.find((owner) => owner.id === filters.owner)?.name ?? "Responsável selecionado")}`,
              ]
            : []),
          ...(filters.due !== "todas"
            ? [`Próxima ação: ${filters.due === "hoje" ? "Hoje" : "Atrasadas"}`]
            : []),
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status">{initial.total} negociações nesta seleção</p>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/negociacoes")}
        >
          Restaurar filtros padrão
        </Button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {initial.items.map((o) => (
          <Card key={o.id}>
            <CardHeader>
              <CardTitle className="break-words">
                <Link
                  className="relationship-link"
                  href={`/negociacoes/${o.id}?${new URLSearchParams({ returnTo: href(initial.page) })}`}
                >
                  {o.title}
                </Link>
              </CardTitle>
              <CardDescription>
                Cliente: {o.customer.name}
                <br />
                Responsável: {o.owner.name}
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
                <strong>Próxima ação: </strong>
                {o.nextAction ?? "Oportunidade encerrada"}
              </p>
              <p>
                {o.principalQuoteId
                  ? (() => {
                      const principal = o.quotes.find(
                        (q) => q.id === o.principalQuoteId,
                      );
                      return principal
                        ? `Principal: ${principal.number} · versão ${principal.version} · ${commerceStatusLabel(principal.status)}`
                        : "Orçamento principal indisponível nesta consulta.";
                    })()
                  : o.quotes.length
                    ? "Orçamentos vinculados; principal não definido."
                    : "Sem orçamento vinculado."}
              </p>
              {o.pendingNotes && (
                <p className="whitespace-pre-wrap">
                  <strong>Pendências: </strong>
                  {o.pendingNotes}
                </p>
              )}
              {o.lossReason && (
                <p className="whitespace-pre-wrap">
                  <strong>Motivo da perda: </strong>
                  {o.lossReason}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {!initial.items.length ? (
        <Empty role="status">
          <EmptyHeader>
            <EmptyTitle>
              {initial.total > 0
                ? "Nenhuma negociação nesta página"
                : "Nenhuma negociação nesta seleção"}
            </EmptyTitle>
            <EmptyDescription>
              {initial.total > 0
                ? "Os resultados mudaram. Volte à primeira página para continuar."
                : "Revise os filtros, incluindo a etapa, ou crie uma oportunidade pela ação no início da página."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              onClick={() =>
                router.push(initial.total > 0 ? href(1) : "/negociacoes")
              }
            >
              {initial.total > 0
                ? "Voltar à primeira página"
                : "Restaurar filtros padrão"}
            </Button>
          </EmptyContent>
        </Empty>
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
