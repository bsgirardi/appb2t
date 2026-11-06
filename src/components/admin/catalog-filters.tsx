"use client";

import { useId, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

const changeEvent = "catalog-filters-change";
function subscribe(notify: () => void) {
  window.addEventListener("popstate", notify);
  window.addEventListener(changeEvent, notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener(changeEvent, notify);
  };
}
const readSearch = () => window.location.search;
const serverSearch = () => "";
function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

/** The administrative endpoints load the complete collection; no request per keypress. */
export function useCatalogFilters() {
  const query = useSyncExternalStore(subscribe, readSearch, serverSearch);
  const params = new URLSearchParams(query);
  const search = params.get("search") ?? "";
  const rawState = params.get("state");
  const state =
    rawState === "active" || rawState === "inactive" ? rawState : "all";
  function apply(search: string, state: string) {
    const url = new URL(window.location.href);
    const trimmed = search.trim();
    if (trimmed) url.searchParams.set("search", trimmed);
    else url.searchParams.delete("search");
    if (state === "active" || state === "inactive")
      url.searchParams.set("state", state);
    else url.searchParams.delete("state");
    if (url.search !== window.location.search) {
      window.history.pushState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
      window.dispatchEvent(new Event(changeEvent));
    }
  }
  return {
    search,
    state,
    apply,
    clear: () => apply("", "all"),
    matches: (row: { name: string; active: boolean }) =>
      normalized(row.name).includes(normalized(search)) &&
      (state === "all" || row.active === (state === "active")),
  };
}

export function CatalogFilters({
  filters,
  count,
  total,
  kind,
}: {
  filters: ReturnType<typeof useCatalogFilters>;
  count: number;
  total: number;
  kind: "products" | "kits";
}) {
  const id = useId();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    filters.apply(
      String(data.get("search") ?? ""),
      String(data.get("state") ?? "all"),
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <form
        key={`${filters.search}:${filters.state}`}
        aria-label="Filtrar registros"
        onSubmit={submit}
      >
        <FieldGroup className="catalog-admin-filters grid gap-3">
          <Field
            label="Buscar por nome"
            name="search"
            defaultValue={filters.search}
            maxLength={160}
            type="search"
          />
          <div className="field">
            <Label htmlFor={`${id}-state`}>Estado no catálogo</Label>
            <NativeSelect
              id={`${id}-state`}
              name="state"
              defaultValue={filters.state}
            >
              <option value="all">Todos</option>
              <option value="active">
                {kind === "products" ? "Ativos" : "Publicados"}
              </option>
              <option value="inactive">
                {kind === "products" ? "Inativos" : "Rascunhos"}
              </option>
            </NativeSelect>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Aplicar filtros</Button>
            {(filters.search || filters.state !== "all") && (
              <Button type="button" variant="outline" onClick={filters.clear}>
                Limpar filtros
              </Button>
            )}
          </div>
        </FieldGroup>
      </form>
      <p className="muted" role="status">
        {count} de {total} {kind === "products" ? "produtos" : "kits"}
        {filters.search ? ` · Busca: ${filters.search}` : ""}
      </p>
    </div>
  );
}

export function CatalogEmpty({
  filtered,
  kind,
  create,
}: {
  filtered: boolean;
  kind: "products" | "kits";
  create: () => void;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>
          {filtered
            ? "Nenhum resultado para estes filtros"
            : kind === "products"
              ? "Nenhum produto cadastrado"
              : "Nenhum kit cadastrado"}
        </EmptyTitle>
        <EmptyDescription>
          {filtered
            ? "Ajuste a busca ou limpe os filtros para consultar os registros."
            : kind === "products"
              ? "Cadastre a peça, suas fotos e seus custos para preparar o catálogo."
              : "Crie um conjunto com as peças permitidas e suas condições."}
        </EmptyDescription>
      </EmptyHeader>
      {!filtered && (
        <EmptyContent>
          <Button type="button" onClick={create}>
            {kind === "products"
              ? "Cadastrar primeiro produto"
              : "Criar primeiro kit"}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
