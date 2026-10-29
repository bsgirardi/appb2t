"use client";
import { useState } from "react";
import { api } from "@/lib/client-api";
import type { AdSourceSnapshot } from "@/domain/advertising/types";
import { Field, FieldGroup, Notice } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
export type AdProductsPage = {
  products: AdSourceSnapshot[];
  total: number;
  pages: number;
};
export function AdProductPicker({
  initial,
  onPick,
  disabled,
}: {
  initial: AdProductsPage;
  onPick: (product: AdSourceSnapshot) => void;
  disabled: boolean;
}) {
  const [data, setData] = useState(initial),
    [search, setSearch] = useState(""),
    [applied, setApplied] = useState(""),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function load(next: number, term = applied) {
    setBusy(true);
    setError("");
    try {
      setData(
        await api<AdProductsPage>(
          `/api/anuncios/produtos?${new URLSearchParams({ search: term, page: String(next) })}`,
        ),
      );
      setPage(next);
      setApplied(term);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load(1, search);
        }}
      >
        <FieldGroup>
          <Field
            label="Procurar produto por nome ou código"
            maxLength={100}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={busy || disabled}
          />
          <Button type="submit" variant="outline" disabled={busy || disabled}>
            Procurar produto
          </Button>
        </FieldGroup>
      </form>
      {error && <Notice>{error}</Notice>}
      <p>
        {data.total}{" "}
        {data.total === 1 ? "produto encontrado" : "produtos encontrados"}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {data.products.map((p) => (
          <li
            key={p.productId}
            className="flex min-w-0 flex-col gap-2 rounded-lg border p-3"
          >
            <p className="break-words">
              {p.name}
              {p.sku ? ` · ${p.sku}` : ""}
            </p>
            {!p.active && <p>Não publicado no catálogo</p>}
            <Button
              type="button"
              variant="outline"
              disabled={busy || disabled || !p.images.length}
              aria-label={`Selecionar ${p.name}`}
              onClick={() => onPick(p)}
            >
              Selecionar produto
            </Button>
            {!p.images.length && (
              <p>Cadastre uma foto na ficha para preparar o material.</p>
            )}
          </li>
        ))}
      </ul>
      {data.pages > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            disabled={busy || disabled || page === 1}
            onClick={() => void load(page - 1)}
          >
            Produtos anteriores
          </Button>
          <span>
            Página {page} de {data.pages}
          </span>
          <Button
            variant="outline"
            disabled={busy || disabled || page >= data.pages}
            onClick={() => void load(page + 1)}
          >
            Próximos produtos
          </Button>
        </div>
      )}
    </div>
  );
}
