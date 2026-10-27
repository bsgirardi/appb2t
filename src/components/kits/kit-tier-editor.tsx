"use client";
import { useId } from "react";
import { Field } from "@/components/ui/field";
import { CATALOG_MAX_KIT_QUANTITY } from "@/domain/products/quantity";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import type { KitDiscountTier } from "@/domain/kits/types";
export function KitTierEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: KitDiscountTier[];
  onChange: (value: KitDiscountTier[]) => void;
  disabled?: boolean;
}) {
  const id = useId();
  function change(index: number, tier: KitDiscountTier) {
    onChange(value.map((v, i) => (i === index ? tier : v)));
  }
  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-3">
      <legend>Desconto por quantidade de itens no kit</legend>
      <p className="muted">
        Todas as unidades contam. Aplica-se a faixa de maior quantidade mínima
        atingida. O desconto fixo é abatido uma vez do total do kit.
      </p>
      {value.map((tier, index) => (
        <div key={index} className="form-grid">
          <Field
            label={`Quantidade mínima do kit na faixa ${index + 1}`}
            type="number"
            min={1}
            max={CATALOG_MAX_KIT_QUANTITY}
            step={1}
            className="min-h-11"
            value={Number.isNaN(tier.minQuantity) ? "" : tier.minQuantity}
            onChange={(e) =>
              change(index, { ...tier, minQuantity: e.target.valueAsNumber })
            }
          />
          <div className="field">
            <Label htmlFor={`${id}-${index}`}>
              Tipo de desconto da faixa {index + 1}
            </Label>
            <NativeSelect
              id={`${id}-${index}`}
              className="min-h-11"
              value={tier.kind}
              onChange={(e) =>
                change(
                  index,
                  e.target.value === "FIXED"
                    ? {
                        minQuantity: tier.minQuantity,
                        kind: "FIXED",
                        amount: "",
                      }
                    : {
                        minQuantity: tier.minQuantity,
                        kind: "PERCENT",
                        percent: "",
                      },
                )
              }
            >
              <option value="PERCENT">Percentual</option>
              <option value="FIXED">Valor fixo em reais</option>
            </NativeSelect>
          </div>
          <Field
            label={
              tier.kind === "PERCENT"
                ? `Percentual da faixa ${index + 1} (%)`
                : `Desconto fixo da faixa ${index + 1} (R$)`
            }
            inputMode="decimal"
            className="min-h-11"
            value={tier.kind === "PERCENT" ? tier.percent : tier.amount}
            onChange={(e) =>
              change(
                index,
                tier.kind === "PERCENT"
                  ? { ...tier, percent: e.target.value.replace(",", ".") }
                  : { ...tier, amount: e.target.value.replace(",", ".") },
              )
            }
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            Remover desconto {index + 1}
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
              kind: "PERCENT",
              percent: "",
            },
          ])
        }
      >
        Adicionar faixa de desconto
      </Button>
    </fieldset>
  );
}
