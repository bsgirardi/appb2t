"use client";
import { useState } from "react";
import type { PricingV2Input } from "@/domain/pricing/types";
import { calculateScenarios } from "@/domain/pricing/scenarios";
import { formatBRL } from "@/domain/calculation/calculate";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
export function PricingScenarios({
  input,
  onSelect,
}: {
  input: PricingV2Input;
  onSelect: (quantity: number) => void;
}) {
  const [text, setText] = useState("");
  let rows: ReturnType<typeof calculateScenarios> = [],
    error = "";
  if (text.trim())
    try {
      const parts = text.split(/[,;\s]+/).filter(Boolean);
      if (parts.some((p) => !/^\d+$/.test(p))) throw new Error();
      rows = calculateScenarios(input, parts.map(Number));
    } catch {
      error =
        "Informe até 10 quantidades inteiras válidas, separadas por vírgula.";
    }
  return (
    <details>
      <summary>Comparar quantidades</summary>
      <Field
        label="Quantidades para comparar"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="1, 10, 20"
      />
      {error && <p role="alert">{error}</p>}
      <p className="muted">
        Tempos fixos, desperdício e preparação são mantidos uma vez por lote.
        Revise a ocupação da máquina antes de aplicar.
      </p>
      <ul>
        {rows.map((r, i) => (
          <li
            className="flex flex-wrap items-center justify-between gap-3 py-2"
            key={i}
          >
            {r.quantity} peças · {formatBRL(r.result.offeredUnitPrice)} por peça{" "}
            <Button
              type="button"
              variant="outline"
              onClick={() => onSelect(r.quantity)}
            >
              Usar {r.quantity} peças
            </Button>
          </li>
        ))}
      </ul>
      <p className="muted">
        Comparar não publica preços nem cria descontos automáticos.
      </p>
    </details>
  );
}
