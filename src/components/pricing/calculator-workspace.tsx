"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRef, useState } from "react";
import type { CalculatorData } from "@/domain/calculation/types";
import type { PricingCatalogDTO } from "@/domain/pricing/types";
import { useDocumentExit } from "@/components/commerce/use-document-exit";
import { createEstimate } from "@/lib/pricing-client";

import { GuidedPricingForm } from "./guided-pricing-form";
import type { PricingRequest } from "@/domain/pricing/types";
export function CalculatorWorkspace({
  role,
  catalog,
}: {
  data: CalculatorData;
  role: "ADMIN" | "OPERATOR";
  catalog: PricingCatalogDTO;
}) {
  const router = useRouter();
  const [fingerprint, setFingerprint] = useState("");
  const baseline = useRef<string | null>(null);
  const exit = useDocumentExit(fingerprint);
  const operation = useRef<{ body: string; key: string } | null>(null);

  async function apply(request: PricingRequest) {
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
        canManageChannels={role === "ADMIN"}
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
    </div>
  );
}
