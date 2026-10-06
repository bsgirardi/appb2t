"use client";
import { useRef, useState } from "react";
import type { DocumentItemInput } from "@/domain/commerce/types";
import type {
  PricingCatalogDTO,
  PricingSnapshotDTO,
} from "@/domain/pricing/types";
import { BatchPricingForm } from "./batch-pricing-form";
import { createEstimate } from "@/lib/pricing-client";
import { Label } from "@/components/ui/label";
export function LinePricingEditor({
  item,
  catalog,
  snapshot,
  onAttach,
}: {
  item: DocumentItemInput;
  catalog: PricingCatalogDTO;
  snapshot?: PricingSnapshotDTO;
  onAttach: (snapshot: PricingSnapshotDTO) => void;
}) {
  const [reviewed, setReviewed] = useState(false);
  const operation = useRef<{ body: string; key: string } | null>(null);
  return (
    <section className="space-y-3">
      <p>
        Estimativa para:{" "}
        <strong>{item.description || "Informe a descrição do item"}</strong> ·{" "}
        {item.quantity} peça(s). Revise consumo, tempos e parâmetros atuais
        antes de anexar.
      </p>
      <Label className="flex gap-2">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(e) => setReviewed(e.target.checked)}
        />
        Revisei os parâmetros e a correspondência com este item
      </Label>
      <BatchPricingForm
        catalog={catalog}
        initialInput={snapshot?.input}
        fixedQuantity={item.quantity}
        applyLabel="Anexar estimativa ao item"
        onApply={async (request) => {
          if (!reviewed || !item.description.trim())
            throw new Error(
              "Revise os parâmetros e confirme a correspondência com o item.",
            );
          const body = JSON.stringify(request);
          if (operation.current?.body !== body)
            operation.current = { body, key: crypto.randomUUID() };
          onAttach(await createEstimate(request, operation.current!.key));
        }}
      />
    </section>
  );
}
