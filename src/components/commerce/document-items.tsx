"use client";
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
}: {
  items: DocumentItemInput[];
  products: CommercialProduct[];
  onChange: (items: DocumentItemInput[]) => void;
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
          <fieldset key={index} className="commerce-item">
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
              { description: "", quantity: 1, unitPrice: "" },
            ])
          }
        >
          Adicionar item
        </Button>
      </section>
    </Card>
  );
}
