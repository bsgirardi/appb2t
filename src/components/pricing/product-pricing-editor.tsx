"use client";
import { useRef, useState } from "react";
import type { CalculationInput } from "@/domain/calculation/types";
import type {
  PricingCatalogDTO,
  PricingSnapshotDTO,
  PricingV2Input,
} from "@/domain/pricing/types";
import { api } from "@/lib/client-api";
import { createEstimate } from "@/lib/pricing-client";
import { BatchPricingForm } from "./batch-pricing-form";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
export function ProductPricingEditor({
  snapshot,
  legacy,
  materialId,
  printerId,
  onApply,
}: {
  snapshot?: PricingSnapshotDTO;
  legacy: CalculationInput;
  materialId?: string | null;
  printerId?: string | null;
  onApply: (snapshot: PricingSnapshotDTO) => void;
}) {
  const [catalog, setCatalog] = useState<PricingCatalogDTO | null>(null),
    [reviewed, setReviewed] = useState(false),
    [error, setError] = useState("");
  const operation = useRef<{ body: string; key: string } | null>(null);
  async function open() {
    try {
      setCatalog(await api("/api/pricing/catalog"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  let initial: PricingV2Input | undefined = snapshot?.input;
  if (!initial && catalog?.settings) {
    const material = catalog.materials.find((m) => m.id === materialId),
      printer = catalog.printers.find((p) => p.id === printerId);
    if (material && printer)
      initial = {
        technology: legacy.technology,
        quantity: 1,
        materials: [
          {
            ref: { id: material.id, version: material.version },
            name: material.name,
            unit: legacy.technology === "FDM" ? "G" : "ML",
            pricePerBase: material.price,
            consumptionPerUnit: legacy.consumption,
            fixedWaste: "0",
          },
        ],
        printer: {
          ...printer,
          ref: { id: printer.id, version: printer.version },
        },
        machineFixedMinutes: Number.isFinite(legacy.hours)
          ? String(legacy.hours * 60 + legacy.minutes)
          : "",
        machineMinutesPerUnit: "0",
        setupMinutes: "0",
        finishingMinutesPerUnit: "0",
        extras: [],
        channel: {
          ref: { id: "", version: 1 },
          name: "",
          fees: [],
          fixedCost: "0",
        },
        ...catalog.settings,
        mode: "MARKUP",
        informedUnitPrice: "0",
        version: 2,
      };
  }
  return (
    <section className="rounded-lg border p-4 space-y-3">
      <h2>Ficha de custo</h2>
      <p>
        {snapshot
          ? "Memória por lote preservada."
          : "Você pode manter o cálculo original ou preparar uma ficha por lote."}
      </p>
      {error && <Notice>{error}</Notice>}
      {!catalog ? (
        <Button type="button" variant="outline" onClick={open}>
          {snapshot ? "Revisar ficha por lote" : "Preparar ficha por lote"}
        </Button>
      ) : (
        <>
          {!snapshot && (
            <>
              <Notice kind="info">
                A ficha anterior será preservada ao salvar. Consumo e tempo
                serão copiados quando suas referências estiverem disponíveis.
                Revise manutenção por hora, trabalho, complementos e fixação;
                percentuais antigos não são convertidos automaticamente.
              </Notice>
              <Label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                Revisei a mudança das bases de custo
              </Label>
            </>
          )}
          <BatchPricingForm
            catalog={catalog}
            initialInput={initial}
            onApply={async (request) => {
              if (!snapshot && !reviewed)
                throw new Error(
                  "Confirme a revisão das bases de custo antes de aplicar.",
                );
              const body = JSON.stringify(request);
              if (operation.current?.body !== body)
                operation.current = { body, key: crypto.randomUUID() };
              const next = await createEstimate(
                request,
                operation.current!.key,
              );
              onApply(next);
              setCatalog(null);
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setCatalog(null)}
          >
            Cancelar revisão da ficha
          </Button>
        </>
      )}
    </section>
  );
}
