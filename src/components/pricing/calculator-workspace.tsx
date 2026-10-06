"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { CalculatorData } from "@/domain/calculation/types";
import type { PricingCatalogDTO } from "@/domain/pricing/types";
import { CalculatorForm } from "@/components/calculator/calculator-form";
import { BatchPricingForm } from "./batch-pricing-form";
import { createEstimate } from "@/lib/pricing-client";
import { Button } from "@/components/ui/button";
export function CalculatorWorkspace({
  data,
  role,
  catalog,
}: {
  data: CalculatorData;
  role: "ADMIN" | "OPERATOR";
  catalog: PricingCatalogDTO;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"legacy" | "batch">("legacy");
  const operation = useRef<{ body: string; key: string } | null>(null);
  return (
    <>
      <div className="flex flex-wrap gap-3 mb-5" aria-label="Tipo de cálculo">
        <Button
          type="button"
          variant={mode === "legacy" ? "default" : "outline"}
          onClick={() => setMode("legacy")}
        >
          Cálculo original
        </Button>
        <Button
          type="button"
          variant={mode === "batch" ? "default" : "outline"}
          onClick={() => setMode("batch")}
        >
          Cálculo por lote
        </Button>
      </div>
      {mode === "legacy" ? (
        <CalculatorForm data={data} role={role} />
      ) : (
        <BatchPricingForm
          catalog={catalog}
          applyLabel="Aplicar ao rascunho de produto"
          onApply={async (request) => {
            const body = JSON.stringify(request);
            if (operation.current?.body !== body)
              operation.current = { body, key: crypto.randomUUID() };
            const snapshot = await createEstimate(
              request,
              operation.current!.key,
            );
            router.push(
              `/produtos?pricingSnapshot=${encodeURIComponent(snapshot.id)}`,
            );
          }}
        />
      )}
    </>
  );
}
