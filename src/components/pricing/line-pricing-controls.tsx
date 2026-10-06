"use client";
import { useState } from "react";
import type { DocumentItemInput } from "@/domain/commerce/types";
import type {
  PricingCatalogDTO,
  PricingSnapshotDTO,
  LineCostBinding,
} from "@/domain/pricing/types";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/field";
import { LinePricingEditor } from "./line-pricing-editor";
import { LineCostSummary, currentBindingState } from "./line-cost-summary";
import { parseMoney } from "@/domain/commerce/validation";
export function LinePricingControls({
  item,
  snapshot,
  binding,
  onAttach,
  onRemove,
  onPrice,
}: {
  item: DocumentItemInput;
  snapshot?: PricingSnapshotDTO;
  binding?: LineCostBinding;
  onAttach: (s: PricingSnapshotDTO) => void;
  onRemove: () => void;
  onPrice: (price: string) => void;
}) {
  const [catalog, setCatalog] = useState<PricingCatalogDTO | null>(null),
    [error, setError] = useState("");
  async function open() {
    try {
      setCatalog(await api("/api/pricing/catalog"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const state = binding ? currentBindingState(item, binding) : undefined;
  return (
    <section className="no-print print:hidden space-y-3 col-span-full">
      {error && <Notice>{error}</Notice>}
      <LineCostSummary item={item} snapshot={snapshot} state={state} />
      {catalog ? (
        <>
          <LinePricingEditor
            key={JSON.stringify([
              item.lineId,
              item.productId,
              item.description,
              item.quantity,
            ])}
            item={item}
            snapshot={snapshot}
            catalog={catalog}
            onAttach={(s) => {
              onAttach(s);
              setCatalog(null);
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setCatalog(null)}
          >
            Cancelar cálculo do item
          </Button>
        </>
      ) : (
        <Button type="button" variant="outline" onClick={open}>
          {snapshot ? "Recalcular estimativa" : "Calcular custo do item"}
        </Button>
      )}
      {snapshot && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onRemove}>
            Remover estimativa
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={state !== "VALID"}
            onClick={() => {
              try {
                onPrice(
                  parseMoney(snapshot.result.offeredUnitPrice, {
                    positive: true,
                  }),
                );
                setError("");
              } catch {
                setError(
                  "O preço sugerido deve ser positivo para uso comercial.",
                );
              }
            }}
          >
            Usar preço sugerido neste item
          </Button>
        </div>
      )}
    </section>
  );
}
