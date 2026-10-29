"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRef, useState } from "react";
import type { CalculatorData } from "@/domain/calculation/types";
import type { PricingCatalogDTO } from "@/domain/pricing/types";
import { CalculatorForm } from "@/components/calculator/calculator-form";
import { BatchPricingForm } from "./batch-pricing-form";
import { createEstimate } from "@/lib/pricing-client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GuidedPricingForm } from "./guided-pricing-form";
import type { PricingRequest } from "@/domain/pricing/types";
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
  const [mode, setMode] = useState<"legacy" | "batch" | "guided">("legacy");
  const operation = useRef<{ body: string; key: string } | null>(null);
  const [visited, setVisited] = useState(() => new Set(["legacy"]));
  async function apply(request: PricingRequest) {
    const body = JSON.stringify(request);
    if (operation.current?.body !== body)
      operation.current = { body, key: crypto.randomUUID() };
    const snapshot = await createEstimate(request, operation.current!.key);
    router.push(`/produtos?pricingSnapshot=${encodeURIComponent(snapshot.id)}`);
  }
  return (
    <Tabs
      value={mode}
      onValueChange={(value) => {
        setMode(value as typeof mode);
        setVisited((previous) => new Set([...previous, value]));
      }}
    >
      <p className="mb-4">
        <Link href="/calculadora/cenarios">
          Comparações de canais e descontos salvas
        </Link>
      </p>
      <TabsList
        aria-label="Tipo de cálculo"
        className="mb-5 h-auto flex-wrap justify-start gap-1"
      >
        <TabsTrigger value="legacy">Cálculo original</TabsTrigger>
        <TabsTrigger value="batch">Cálculo por lote · V2</TabsTrigger>
        <TabsTrigger value="guided">Calculadora V3</TabsTrigger>
      </TabsList>
      <TabsContent value="legacy" forceMount hidden={mode !== "legacy"}>
        <CalculatorForm data={data} role={role} />
      </TabsContent>
      {visited.has("batch") && (
        <TabsContent value="batch" forceMount hidden={mode !== "batch"}>
          <BatchPricingForm
            catalog={catalog}
            applyLabel="Aplicar ao rascunho de produto"
            onApply={apply}
          />
        </TabsContent>
      )}
      {visited.has("guided") && (
        <TabsContent value="guided" forceMount hidden={mode !== "guided"}>
          <GuidedPricingForm
            catalog={catalog}
            applyLabel="Aplicar ao rascunho de produto"
            onApply={apply}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
