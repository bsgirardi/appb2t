"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { CalculatorData } from "@/domain/calculation/types";
import type { PricingCatalogDTO } from "@/domain/pricing/types";
import { CalculatorForm } from "@/components/calculator/calculator-form";
import { useDocumentExit } from "@/components/commerce/use-document-exit";
import { createEstimate } from "@/lib/pricing-client";

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
  const [originalVisited, setOriginalVisited] = useState(false);
  const [fingerprint, setFingerprint] = useState("");
  const baseline = useRef<string | null>(null);
  const [legacyFingerprint, setLegacyFingerprint] = useState("");
  const legacyBaseline = useRef<string | null>(null);
  const trackLegacy = useCallback((value: string) => {
    legacyBaseline.current ??= value;
    setLegacyFingerprint(value === legacyBaseline.current ? "" : value);
  }, []);
  const exit = useDocumentExit(
    JSON.stringify([fingerprint, legacyFingerprint]),
  );
  const operation = useRef<{ body: string; key: string } | null>(null);

  async function apply(request: PricingRequest) {
    if (
      legacyFingerprint &&
      !window.confirm(
        "Ao abrir o produto, a simulação original não aplicada será deixada para trás. Continuar?",
      )
    )
      return;
    const body = JSON.stringify(request);
    if (operation.current?.body !== body)
      operation.current = { body, key: crypto.randomUUID() };
    const snapshot = await createEstimate(request, operation.current!.key);
    exit.markSaved();
    router.push(`/produtos?pricingSnapshot=${encodeURIComponent(snapshot.id)}`);
  }
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <GuidedPricingForm
        catalog={catalog}
        onApply={apply}
        applyLabel="Aplicar ao rascunho de produto"
        onDraftChange={(value) => {
          baseline.current ??= value;
          setFingerprint(value === baseline.current ? "" : value);
        }}
      />
      <p>
        <Link href="/calculadora/cenarios">
          Biblioteca de cenários e comparações salvas
        </Link>
      </p>
      <details
        onToggle={(event) => {
          if (event.currentTarget.open) setOriginalVisited(true);
        }}
      >
        <summary>Consultar cálculo original</summary>
        <p className="my-4 text-muted-foreground">
          Memórias antigas mantêm manutenção percentual, acabamento e fixação
          originais. Não há conversão automática para a ficha por lote.
        </p>
        {originalVisited && (
          <CalculatorForm data={data} role={role} onDraftChange={trackLegacy} />
        )}
      </details>
    </div>
  );
}
