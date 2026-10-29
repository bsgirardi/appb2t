"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import type {
  PricingCatalogDTO,
  PricingRequest,
  PricingV2Input,
  Ref,
} from "@/domain/pricing/types";
import type {
  ComparisonAlternative,
  ComparisonDraft,
  ComparisonPreview,
  ComparisonReference,
} from "@/domain/pricing/comparisons/types";
import { previewComparison } from "@/domain/pricing/comparisons/calculate";
import { comparisonDraftSchema } from "@/domain/pricing/comparisons/validation";
import { saveComparison } from "@/lib/pricing-comparisons-client";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, Notice } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ComparisonResults } from "./comparison-results";
export function ComparisonEditor({
  input,
  request,
  catalog,
  onUseOffer,
}: {
  input: PricingV2Input;
  request: PricingRequest;
  catalog: PricingCatalogDTO;
  onUseOffer: (ref: Ref, price: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"CHANNEL" | "COMMON">(
    input.mode === "INFORMED" ? "COMMON" : "CHANNEL",
  );
  const [price, setPrice] = useState(
    input.mode === "INFORMED" ? input.informedUnitPrice : "",
  );
  const [alternatives, setAlternatives] = useState<ComparisonAlternative[]>([
    { channelRef: input.channel.ref, discountPercent: "0" },
  ]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [saved, setSaved] = useState<{ id: string; name: string } | null>(null);
  const operation = useRef<{ body: string; key: string } | null>(null),
    lock = useRef(false);
  const reference: ComparisonReference =
    kind === "CHANNEL" ? { kind } : { kind, unitPrice: price };
  let preview: ComparisonPreview | null = null,
    invalid = "";
  try {
    preview = previewComparison(
      input,
      catalog.channels,
      reference,
      alternatives,
    );
  } catch {
    invalid =
      "Revise os canais, o preço comum e os descontos (0 a 100%, até duas casas decimais).";
  }
  const draft: ComparisonDraft = { name, request, reference, alternatives };
  const canSave =
    comparisonDraftSchema.safeParse(draft).success &&
    preview?.alternatives.every((r) => r.status === "VALID");
  const patch = (i: number, next: Partial<ComparisonAlternative>) =>
    setAlternatives((rows) =>
      rows.map((r, j) => (i === j ? { ...r, ...next } : r)),
    );
  async function save() {
    if (!canSave || lock.current) return;
    const body = JSON.stringify(draft);
    if (operation.current?.body !== body)
      operation.current = { body, key: crypto.randomUUID() };
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await saveComparison(draft, operation.current.key);
      setSaved({ id: response.id, name: response.name });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <details open={open}>
      <summary
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        Comparar canais e descontos
      </summary>
      {open && (
        <FieldGroup className="mt-4">
          <p className="muted">
            Mesmo lote, com taxas cadastradas. Cada desconto é aplicado uma vez
            ao preço por peça, antes das taxas.
          </p>
          <ToggleGroup
            type="single"
            value={kind}
            onValueChange={(v) => {
              if (v === "CHANNEL" || v === "COMMON") setKind(v);
            }}
            aria-label="Base de preço"
            className="h-auto max-w-full flex-wrap"
          >
            <ToggleGroupItem value="CHANNEL">
              Preço calculado por canal
            </ToggleGroupItem>
            <ToggleGroupItem value="COMMON">
              Mesmo preço entre canais
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="muted">
            Política do formulário:{" "}
            {input.mode === "MARKUP"
              ? "Markup"
              : input.mode === "CONTRIBUTION"
                ? "Meta de contribuição"
                : "Preço informado"}
            .{" "}
            {kind === "COMMON"
              ? "Preço comum explicitamente informado abaixo."
              : "Cada canal calcula seu próprio preço de referência."}
          </p>
          {kind === "COMMON" && (
            <Field
              label="Preço comum por peça (R$)"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          )}
          {alternatives.map((a, i) => (
            <FieldGroup key={i}>
              <Label>
                Canal {i + 1}
                <NativeSelect
                  value={a.channelRef.id}
                  aria-label={`Canal ${i + 1}`}
                  onChange={(e) => {
                    const c = catalog.channels.find(
                      (c) => c.id === e.target.value,
                    );
                    if (c)
                      patch(i, {
                        channelRef: { id: c.id, version: c.version },
                      });
                  }}
                >
                  {!catalog.channels.some(
                    (c) => c.id === a.channelRef.id && c.active,
                  ) && (
                    <NativeSelectOption value={a.channelRef.id}>
                      Canal indisponível
                    </NativeSelectOption>
                  )}
                  {catalog.channels
                    .filter((c) => c.active)
                    .map((c) => (
                      <NativeSelectOption key={c.id} value={c.id}>
                        {c.name}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
              </Label>
              <Field
                label={`Desconto ${i + 1} (%)`}
                inputMode="decimal"
                value={a.discountPercent}
                onChange={(e) => patch(i, { discountPercent: e.target.value })}
                error={invalid || undefined}
              />
              {alternatives.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setAlternatives((r) => r.filter((_, j) => i !== j))
                  }
                >
                  Remover alternativa {i + 1}
                </Button>
              )}
            </FieldGroup>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={alternatives.length >= 10}
            onClick={() =>
              setAlternatives((rows) => [
                ...rows,
                { channelRef: input.channel.ref, discountPercent: "0" },
              ])
            }
          >
            Adicionar alternativa
          </Button>
          {invalid && <Notice>{invalid}</Notice>}
          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            {preview?.alternatives.map((r, i) =>
              r.status === "VALID" ? (
                <ComparisonResults
                  key={i}
                  value={r.value}
                  index={i}
                  onUse={() =>
                    onUseOffer(
                      r.value.channelRef,
                      r.value.metrics.finalUnitPrice,
                    )
                  }
                />
              ) : (
                <Notice key={i}>{r.message}</Notice>
              ),
            )}
          </div>
          <p className="muted">
            Cobertura inclui depreciação e apenas os custos modelados; não
            garante pagar todas as despesas fixas da empresa. Contribuição é
            anterior à depreciação. Markup não é margem. Pisos arredondam para
            cima a centavos.
          </p>
          <p className="muted">
            Usar oferta leva o preço final ao formulário como preço informado.
            Não publica nem salva produto ou documento. Descontos posteriores no
            documento serão adicionais.
          </p>
          <Field
            label="Nome da comparação"
            hint="Obrigatório apenas para salvar a comparação."
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="button" disabled={!canSave || busy} onClick={save}>
            {busy ? "Salvando comparação…" : "Salvar comparação"}
          </Button>
          {error && <Notice>{error}</Notice>}
          {saved && (
            <p role="status">
              <Link
                href={`/calculadora/cenarios/${encodeURIComponent(saved.id)}`}
              >
                Comparação salva: {saved.name}
              </Link>
              . Edições posteriores exigem novo salvamento.
            </p>
          )}
          <Link href="/calculadora/cenarios">Abrir comparações salvas</Link>
        </FieldGroup>
      )}
    </details>
  );
}
