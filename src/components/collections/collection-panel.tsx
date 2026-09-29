"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CollectionDTO } from "@/domain/collections/types";
import type { ProductDTO } from "@/domain/products/types";
import { CollectionForm } from "./collection-form";
export function CollectionPanel({
  collections,
  products,
}: {
  collections: CollectionDTO[];
  products: ProductDTO[];
}) {
  const [editing, setEditing] = useState<CollectionDTO | "new" | null>(null);
  const router = useRouter();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ORGANIZAÇÃO DO CATÁLOGO</div>
          <h1>Coleções</h1>
          <p>Agrupe suas peças por estilo, ocasião ou finalidade.</p>
        </div>
        <button className="button primary" onClick={() => setEditing("new")}>
          Nova coleção
        </button>
      </div>
      {editing ? (
        <CollectionForm
          key={editing === "new" ? "new" : editing.id}
          collection={editing === "new" ? undefined : editing}
          products={products}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : (
        <div className="product-admin-list">
          {collections.length ? (
            collections.map((c) => (
              <article className="card product-admin-row" key={c.id}>
                <div className="product-admin-info">
                  <h2>{c.name}</h2>
                  <p>{c.description}</p>
                  <span>
                    {c.active ? "Ativa" : "Inativa"} · {c.productIds.length}{" "}
                    produtos
                  </span>
                </div>
                <button
                  className="button secondary"
                  onClick={() => setEditing(c)}
                >
                  Editar coleção
                </button>
              </article>
            ))
          ) : (
            <div className="card">
              <h2>Nenhuma coleção cadastrada.</h2>
              <p>
                Crie uma coleção e escolha os produtos que farão parte dela.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
