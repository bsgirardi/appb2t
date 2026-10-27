"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import {
  CATALOG_MAX_QUANTITY,
  validateProductQuantity,
} from "@/domain/products/quantity";

function quantityError(text: string, minimum: number) {
  if (!text.trim()) return "Informe a quantidade.";
  try {
    validateProductQuantity(Number(text), minimum);
    return null;
  } catch (error) {
    return error instanceof z.ZodError
      ? error.issues[0].message
      : (error as Error).message;
  }
}

export function CatalogQuantityInput({
  id,
  value,
  minimumQuantity = 1,
  disabled,
  ariaLabel,
  onValueChange,
  onValidityChange,
}: {
  id: string;
  value: number;
  minimumQuantity?: number;
  disabled?: boolean;
  ariaLabel?: string;
  onValueChange: (value: number) => boolean | void;
  onValidityChange?: (valid: boolean) => void;
}) {
  const [draft, setDraft] = useState({
    source: value,
    text: Number.isFinite(value) ? String(value) : "",
  });
  const text = Object.is(draft.source, value)
    ? draft.text
    : Number.isFinite(value)
      ? String(value)
      : "";
  const error = quantityError(text, minimumQuantity);
  const reportValidity = useEffectEvent((valid: boolean) =>
    onValidityChange?.(valid),
  );
  useEffect(() => {
    reportValidity(!error);
  }, [error]);
  return (
    <div className="grid min-w-0 max-w-full gap-1">
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={minimumQuantity}
        max={CATALOG_MAX_QUANTITY}
        step={1}
        className="w-36 max-w-full"
        disabled={disabled}
        value={text}
        aria-label={ariaLabel}
        aria-invalid={!!error}
        aria-describedby={`${id}-limits ${id}-error`}
        onChange={(event) => {
          const next = event.target.value;
          if (quantityError(next, minimumQuantity)) {
            setDraft({ source: value, text: next });
            return;
          }
          const number = Number(next);
          const accepted = onValueChange(number) !== false;
          setDraft({
            source: accepted ? number : value,
            text: accepted ? next : String(value),
          });
        }}
      />
      <small
        id={`${id}-limits`}
        className="max-w-xs text-xs leading-5 text-muted-foreground"
      >
        De {minimumQuantity.toLocaleString("pt-BR")} a 100.000 unidades por
        configuração.
      </small>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="max-w-xs text-xs leading-5 text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
