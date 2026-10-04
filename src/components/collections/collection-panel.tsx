"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
        <Button
          variant="default"
          size="sm"
          className=""
          onClick={() => setEditing("new")}
        >
          Nova coleção
        </Button>
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
              <Card key={c.id} asChild>
                <article className="product-admin-row" >
                  <div className="product-admin-info">
                    <h2>{c.name}</h2>
                    <p>{c.description}</p>
                    <span>
                      {c.active ? "Ativa" : "Inativa"} · {c.productIds.length}{" "}
                      produtos
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className=""
                    onClick={() => setEditing(c)}
                  >
                    Editar coleção
                  </Button>
                </article>
              </Card>
            ))
          ) : (
            <Card asChild>
              <div className="">
                <h2>Nenhuma coleção cadastrada.</h2>
                <p>
                  Crie uma coleção e escolha os produtos que farão parte dela.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
