"use client";
import { Badge } from "@/components/ui/badge";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, ArrowUpRight, Package } from "lucide-react";
import type { CalculatorData } from "@/domain/calculation/types";
import type { ProductDTO } from "@/domain/products/types";
import { formatBRL } from "@/domain/calculation/calculate";
import { api } from "@/lib/client-api";
import { Notice } from "@/components/ui/field";
import { ProductForm } from "./product-form";
import type { CollectionDTO } from "@/domain/collections/types";
export function ProductPanel({
  products,
  data,
  role,
  collections = [],
}: {
  products: ProductDTO[];
  data: CalculatorData;
  role: "ADMIN" | "OPERATOR";
  collections?: CollectionDTO[];
}) {
  const [rows, setRows] = useState(products),
    [editing, setEditing] = useState<ProductDTO | "new" | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false);
  function replace(row: ProductDTO) {
    setRows((previous) =>
      [...previous.filter((p) => p.id !== row.id), row].sort(
        (a, b) =>
          Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
      ),
    );
  }
  async function toggle(row: ProductDTO) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      replace(
        await api<ProductDTO>(
          `/api/products/${row.id}`,
          { active: !row.active, expectedVersion: row.version },
          "PATCH",
        ),
      );
      setMessage(
        row.active
          ? "Produto inativado. Ele não aparece mais no catálogo."
          : "Produto reativado no catálogo.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function reload() {
    setBusy(true);
    setError("");
    try {
      setRows(await api<ProductDTO[]>("/api/products"));
      setMessage("Lista atualizada.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PORTFÓLIO DA EQUIPE</div>
          <h1>Produtos</h1>
          <p>
            Da sua calculadora para a vitrine. Gerencie cada peça e seu preço.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">
            Ver catálogo público <ArrowUpRight size={16} />
          </Link>
        </Button>
      </div>
      {editing ? (
        <ProductForm
          key={editing === "new" ? "new" : `${editing.id}-${editing.version}`}
          product={editing === "new" ? undefined : editing}
          data={data}
          role={role}
          collections={collections}
          onCancel={() => setEditing(null)}
          onSaved={(row) => {
            replace(row);
            setEditing(null);
            setMessage("Produto salvo com sucesso.");
          }}
        />
      ) : (
        <>
          {error && <Notice>{error}</Notice>}
          {message && <Notice kind="success">{message}</Notice>}
          <div className="product-toolbar">
            <span className="muted">
              {rows.filter((p) => p.active).length} ativos ·{" "}
              {rows.filter((p) => !p.active).length} inativos
            </span>
            <div className="product-actions">
              <Button
                variant="outline"
                size="sm"
                className=""
                disabled={busy}
                onClick={reload}
              >
                Atualizar lista
              </Button>
              <Button
                variant="default"
                size="sm"
                className=""
                disabled={busy}
                onClick={() => {
                  setEditing("new");
                  setError("");
                  setMessage("");
                }}
              >
                <Plus size={17} />
                Novo produto
              </Button>
            </div>
          </div>
          {!rows.length ? (
            <Card asChild>
              <div className="catalog-empty">
                <Package size={32} />
                <h2>Seu primeiro produto começa aqui.</h2>
                <p>
                  Cadastre uma foto, os detalhes e os custos de produção para
                  publicar.
                </p>
              </div>
            </Card>
          ) : (
            <div className="product-admin-list">
              {rows.map((row) => (
                <Card key={row.id} asChild>
                  <article  className="product-admin-row">
                    <Image
                      src={`${row.imageUrl}?v=${row.version}`}
                      alt={row.name}
                      width={76}
                      height={76}
                      unoptimized
                    />
                    <div className="product-admin-info">
                      <h2>{row.name}</h2>
                      <strong>{formatBRL(row.price)}</strong>
                      <Badge variant="secondary">
                        {row.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="product-actions">
                      <Button
                        variant="outline"
                        size="sm"
                        className=""
                        disabled={busy}
                        onClick={() => setEditing(row)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className=""
                        disabled={busy}
                        onClick={() => toggle(row)}
                      >
                        {row.active ? "Inativar" : "Reativar"}
                      </Button>
                    </div>
                  </article>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
