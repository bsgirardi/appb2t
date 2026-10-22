"use client";
import Image from "next/image";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { PublicProductDTO } from "@/domain/products/types";
export function KitPicker({
  products,
  onSelect,
}: {
  products: PublicProductDTO[];
  onSelect: (product: PublicProductDTO) => void;
}) {
  const id = useId(),
    [search, setSearch] = useState("");
  const filtered = products.filter((p) =>
    p.name
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <section className="kit-picker">
      <h2>Escolha as peças</h2>
      <p className="store-note">
        Produtos permitidos pela equipe para este conjunto.
      </p>
      <Label htmlFor={id}>Buscar peça neste kit</Label>
      <Input
        id={id}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="min-h-11"
      />
      <div className="kit-picker-list">
        {filtered.map((product) => (
          <Button
            key={product.id}
            variant="outline"
            type="button"
            className="kit-picker-product"
            onClick={() => onSelect(product)}
          >
            {product.imageUrl && (
              <Image
                src={product.imageUrl}
                alt=""
                width={64}
                height={64}
                unoptimized
              />
            )}
            <span>{product.name}</span>
          </Button>
        ))}
        {!filtered.length && <p>Nenhuma peça encontrada.</p>}
      </div>
    </section>
  );
}
