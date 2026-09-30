"use client";
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
    <section className="card">
      <h2>Itens do documento</h2>
      <p>
        O preço do catálogo é copiado ao selecionar o produto. Ajuste o valor
        negociado se necessário.
      </p>
      {items.map((item, index) => (
        <fieldset key={index} className="commerce-item">
          <legend>Item {index + 1}</legend>
          <label>
            Produto
            <select
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
            </select>
          </label>
          <label>
            Descrição
            <input
              aria-label={`Descrição ${index + 1}`}
              maxLength={1000}
              value={item.description}
              onChange={(e) => update(index, { description: e.target.value })}
            />
          </label>
          <label>
            Quantidade
            <input
              aria-label={`Quantidade ${index + 1}`}
              type="number"
              min={1}
              max={100000}
              value={item.quantity}
              onChange={(e) =>
                update(index, { quantity: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Preço unitário (R$)
            <input
              aria-label={`Preço unitário ${index + 1}`}
              inputMode="decimal"
              value={item.unitPrice}
              onChange={(e) => update(index, { unitPrice: e.target.value })}
            />
          </label>
          <button
            type="button"
            className="button secondary"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            Remover item {index + 1}
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="button secondary"
        disabled={items.length >= 100}
        onClick={() =>
          onChange([...items, { description: "", quantity: 1, unitPrice: "" }])
        }
      >
        Adicionar item
      </button>
    </section>
  );
}
