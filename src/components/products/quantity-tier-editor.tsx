"use client";
import { Field } from "@/components/ui/field";
import { CATALOG_MAX_QUANTITY } from "@/domain/products/quantity";
import { Button } from "@/components/ui/button";
import type { QuantityTier } from "@/domain/products/quantity-pricing";
export function QuantityTierEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: QuantityTier[];
  onChange: (value: QuantityTier[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-3">
      <legend>Preços por quantidade</legend>
      <p className="muted">
        Cada personalização tem sua própria contagem. A faixa altera o
        preço-base; os adicionais são somados depois. Dentro de kits, vale
        somente a regra do kit.
      </p>
      {value.map((tier, index) => (
        <div key={index} className="form-grid">
          <Field
            label={`Quantidade mínima da faixa ${index + 1}`}
            type="number"
            min={1}
            max={CATALOG_MAX_QUANTITY}
            step={1}
            className="min-h-11"
            value={Number.isNaN(tier.minQuantity) ? "" : tier.minQuantity}
            onChange={(e) =>
              onChange(
                value.map((t, i) =>
                  i === index
                    ? { ...t, minQuantity: e.target.valueAsNumber }
                    : t,
                ),
              )
            }
          />
          <Field
            label={`Preço-base unitário da faixa ${index + 1}`}
            inputMode="decimal"
            className="min-h-11"
            value={tier.baseUnitPrice}
            onChange={(e) =>
              onChange(
                value.map((t, i) =>
                  i === index
                    ? { ...t, baseUnitPrice: e.target.value.replace(",", ".") }
                    : t,
                ),
              )
            }
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            Remover faixa {index + 1}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="min-h-11 self-start"
        disabled={disabled || value.length >= 10}
        onClick={() =>
          onChange([
            ...value,
            {
              minQuantity:
                Array.from({ length: value.length + 1 }, (_, i) => i + 1).find(
                  (n) => !value.some((v) => v.minQuantity === n),
                ) ?? 1,
              baseUnitPrice: "",
            },
          ])
        }
      >
        Adicionar faixa de quantidade
      </Button>
    </fieldset>
  );
}
