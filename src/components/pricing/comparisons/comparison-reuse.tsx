"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PricingCatalogDTO,
  PricingRequest,
  PricingV2Input,
} from "@/domain/pricing/types";
import { reviewComparisonOffer } from "@/domain/pricing/comparisons/reuse";
import { GuidedPricingForm } from "../guided-pricing-form";
import { createEstimate } from "@/lib/pricing-client";
import { Button } from "@/components/ui/button";
export function ComparisonReuse({
  input,
  catalog,
}: {
  input: PricingV2Input;
  catalog: PricingCatalogDTO;
}) {
  const [stage, setStage] = useState<"closed" | "review" | "draft">("closed");
  const router = useRouter();
  const operation = useRef<{ body: string; key: string } | null>(null);
  const reviewed = reviewComparisonOffer(input, catalog);
  async function apply(request: PricingRequest) {
    const body = JSON.stringify(request);
    if (operation.current?.body !== body)
      operation.current = { body, key: crypto.randomUUID() };
    const snapshot = await createEstimate(request, operation.current.key);
    router.push(`/produtos?pricingSnapshot=${encodeURIComponent(snapshot.id)}`);
  }
  if (stage === "closed")
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setStage("review")}
      >
        Reutilizar com parâmetros atuais
      </Button>
    );
  return (
    <section
      className="flex min-w-0 flex-col gap-4"
      aria-label="Revisão da memória"
    >
      <h3>Conferir parâmetros históricos e atuais</h3>
      <p>
        O preço final histórico será um preço informado, sem reaplicar o
        desconto. Custos e margem serão recalculados no rascunho. Substitua
        referências indisponíveis antes de aplicar.
      </p>
      <ul className="flex flex-col gap-2">
        {reviewed.changes.map((line, i) => (
          <li className="break-words" key={i}>
            {line}
          </li>
        ))}
      </ul>
      <Button type="button" variant="ghost" onClick={() => setStage("closed")}>
        Cancelar reutilização
      </Button>
      {stage === "review" ? (
        <Button type="button" onClick={() => setStage("draft")}>
          Conferi os parâmetros: abrir rascunho
        </Button>
      ) : (
        <GuidedPricingForm
          embedded
          catalog={catalog}
          initialRequest={reviewed.request}
          onApply={apply}
          applyLabel="Aplicar ao rascunho de produto"
        />
      )}
    </section>
  );
}
