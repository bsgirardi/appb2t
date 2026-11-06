"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CalculationInput } from "@/domain/calculation/types";
import type {
  PricingCatalogDTO,
  PricingSnapshotDTO,
  PricingRequest,
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
  onPendingChange,
}: {
  snapshot?: PricingSnapshotDTO;
  legacy: CalculationInput;
  materialId?: string | null;
  printerId?: string | null;
  onApply: (snapshot: PricingSnapshotDTO) => void;
  onPendingChange?: (dirty: boolean) => void;
}) {
  const [catalog, setCatalog] = useState<PricingCatalogDTO | null>(null),
    [reviewed, setReviewed] = useState(false),
    [error, setError] = useState("");
  const opening = useRef(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const baseline = useRef<string | null>(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const trackDraft = useCallback((value: string) => {
    baseline.current ??= value;
    setDraftDirty(value !== baseline.current);
  }, []);
  useEffect(() => {
    onPendingChange?.(draftDirty || reviewed || applying);
  }, [draftDirty, reviewed, applying, onPendingChange]);
  function closeReview() {
    if (applying) return;
    if (
      (draftDirty || reviewed) &&
      !window.confirm(
        "Descartar as alterações não aplicadas da ficha de custo?",
      )
    )
      return;
    setCatalog(null);
    setDraftDirty(false);
    setReviewed(false);
    baseline.current = null;
  }
  const operation = useRef<{ body: string; key: string } | null>(null);
  async function open() {
    if (opening.current) return;
    opening.current = true;
    setLoading(true);
    try {
      const nextCatalog = await api<PricingCatalogDTO>("/api/pricing/catalog");
      baseline.current = null;
      setDraftDirty(false);
      setReviewed(false);
      setCatalog(nextCatalog);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      opening.current = false;
      setLoading(false);
    }
  }
  let legacyRequest: PricingRequest | undefined;
  if (!snapshot && catalog) {
    const material = catalog.materials.find(
        (m) => m.id === materialId && m.technology === legacy.technology,
      ),
      printer = catalog.printers.find(
        (p) => p.id === printerId && p.technology === legacy.technology,
      );
    legacyRequest = {
      technology: legacy.technology,
      quantity: 1,
      materials: [
        {
          ref: { id: material?.id ?? "", version: material?.version ?? 1 },
          consumptionPerUnit: legacy.consumption,
          fixedWaste: "0",
        },
      ],
      printerRef: { id: printer?.id ?? "", version: printer?.version ?? 1 },
      machineFixedMinutes:
        Number.isFinite(legacy.hours) && Number.isFinite(legacy.minutes)
          ? String(legacy.hours * 60 + legacy.minutes)
          : "",
      machineMinutesPerUnit: "0",
      setupMinutes: "0",
      finishingMinutesPerUnit: "0",
      extras: [],
      channelRef: { id: "", version: 1 },
      mode: "MARKUP",
      informedUnitPrice: "0",
      expectedSettingsVersion: catalog.settings?.version ?? 1,
    };
  }
  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <h2>Ficha de custo</h2>
      <p>
        {snapshot
          ? "Memória por lote preservada."
          : "Você pode manter o cálculo original ou preparar uma ficha por lote."}
      </p>
      {error && <Notice>{error}</Notice>}
      {!catalog ? (
        <Button
          type="button"
          variant="outline"
          onClick={open}
          disabled={loading}
        >
          {loading
            ? "Carregando ficha…"
            : snapshot
              ? "Revisar ficha por lote"
              : "Preparar ficha por lote"}
        </Button>
      ) : (
        <>
          {!snapshot && (
            <>
              <Notice kind="info">
                A ficha anterior será preservada ao salvar. Consumo e tempo
                serão copiados. Selecione referências substitutas quando as
                anteriores estiverem indisponíveis. Revise manutenção por hora,
                trabalho, complementos e fixação; percentuais antigos não são
                convertidos automaticamente.
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
            onDraftChange={trackDraft}
            initialInput={snapshot?.input}
            initialRequest={legacyRequest}
            onApply={async (request) => {
              if (!snapshot && !reviewed)
                throw new Error(
                  "Confirme a revisão das bases de custo antes de aplicar.",
                );
              const body = JSON.stringify(request);
              if (operation.current?.body !== body)
                operation.current = { body, key: crypto.randomUUID() };
              setApplying(true);
              try {
                const next = await createEstimate(
                  request,
                  operation.current!.key,
                );
                onApply(next);
                setCatalog(null);
                setDraftDirty(false);
                setReviewed(false);
                baseline.current = null;
              } finally {
                setApplying(false);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={closeReview}
            disabled={applying}
          >
            Cancelar revisão da ficha
          </Button>
        </>
      )}
    </section>
  );
}
