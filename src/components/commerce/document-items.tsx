"use client";
import type { ReactNode } from "react";
import { duplicateDocumentItem } from "@/domain/pricing/document-costs";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { DocumentItemInput } from "@/domain/commerce/types";
export type CommercialProduct = { id: string; name: string; price: string };
export function DocumentItems({
  items,
  products,
  onChange,
  renderPrivate,
}: {
  items: DocumentItemInput[];
  products: CommercialProduct[];
  onChange: (items: DocumentItemInput[]) => void;
  renderPrivate?: (item: DocumentItemInput, index: number) => ReactNode;
}) {
  function update(index: number, patch: Partial<DocumentItemInput>) {
    onChange(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }
  return (
    <Card asChild>
      <section className="">
        <h2>Itens do documento</h2>
        <p>
          O preço do catálogo é copiado ao selecionar o produto. Ajuste o valor
          negociado se necessário.
        </p>
        {items.map((item, index) => (
          <fieldset key={item.lineId ?? index} className="commerce-item">
            <legend>Item {index + 1}</legend>
            <Label>
              Produto
              <NativeSelect
                aria-label={`Produto ${index + 1}`}
                value={item.productId ?? ""}
                onChange={(e) => {
                  const product = products.find((p) => p.id === e.target.value);
                  update(
                    index,
                    product
                      ? {
                          productId: product.id,
                          description: product.name,
                          unitPrice: product.price,
                        }
                      : { productId: undefined },
                  );
                }}
              >
                <option value="">Item personalizado</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </Label>
            <Label>
              Descrição
              <Input
                aria-label={`Descrição ${index + 1}`}
                maxLength={1000}
                value={item.description}
                onChange={(e) => update(index, { description: e.target.value })}
              />
            </Label>
            <Label>
              Quantidade
              <Input
                aria-label={`Quantidade ${index + 1}`}
                type="number"
                min={1}
                max={100000}
                value={item.quantity}
                onChange={(e) =>
                  update(index, { quantity: Number(e.target.value) })
                }
              />
            </Label>
            <Label>
              Preço unitário (R$)
              <Input
                aria-label={`Preço unitário ${index + 1}`}
                inputMode="decimal"
                value={item.unitPrice}
                onChange={(e) => update(index, { unitPrice: e.target.value })}
              />
            </Label>
            {renderPrivate?.(item, index)}
            <Button
              type="button"
              variant="outline"
              disabled={items.length >= 100}
              onClick={() =>
                onChange([
                  ...items.slice(0, index + 1),
                  duplicateDocumentItem(item),
                  ...items.slice(index + 1),
                ])
              }
            >
              Duplicar item {index + 1}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={index === 0}
              onClick={() => {
                const next = [...items];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                onChange(next);
              }}
            >
              Subir item {index + 1}
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              className=""
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              Remover item {index + 1}
            </Button>
          </fieldset>
        ))}
        <Button
          variant="outline"
          size="sm"
          type="button"
          className=""
          disabled={items.length >= 100}
          onClick={() =>
            onChange([
              ...items,
              {
                lineId: crypto.randomUUID(),
                description: "",
                quantity: 1,
                unitPrice: "",
              },
            ])
          }
        >
          Adicionar item
        </Button>
      </section>
    </Card>
  );
}
