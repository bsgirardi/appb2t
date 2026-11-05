"use client";
import { FormActions } from "@/components/admin/form-actions";
import { useDocumentExit } from "./use-document-exit";
import { TaskLayout } from "@/components/admin/task-layout";
import { FormSection } from "@/components/admin/form-section";

import { AdminForm } from "@/components/admin/admin-form";
import type {
  LineCostBinding,
  PricingSnapshotDTO,
} from "@/domain/pricing/types";
import { lineFingerprint } from "@/domain/pricing/document-costs";
import { LinePricingControls } from "@/components/pricing/line-pricing-controls";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useRef, useState, type FormEvent } from "react";
import type { QuoteDTO, QuoteDraftInput } from "@/domain/commerce/types";
import type { CustomerDTO } from "@/domain/customers/types";
import { quoteDraftSchema } from "@/domain/commerce/validation";
import { calculateDocumentTotals } from "@/domain/commerce/totals";
import { api } from "@/lib/client-api";
import { Notice, Field } from "@/components/ui/field";
import { DocumentItems, type CommercialProduct } from "./document-items";
import { CatalogOrigins } from "./catalog-origin";
import { Checkbox } from "@/components/ui/checkbox";
import {
  discountReviewFingerprint,
  type KitDiscountReview,
} from "@/domain/kits/document";
import { KitDocumentHistory } from "./kit-document-history";
export function QuoteForm({
  quote,
  customers,
  products,
  onSaved,
  onCancel,
  saveDraft,
  title,
}: {
  quote?: QuoteDTO;
  customers: CustomerDTO[];
  products: CommercialProduct[];
  onSaved: (q: QuoteDTO) => void;
  onCancel: () => void;
  saveDraft?: (
    draft: QuoteDraftInput,
    costBindings?: { lineId: string; snapshotId: string }[],
    kitDiscountReview?: KitDiscountReview,
  ) => Promise<void>;
  title?: string;
}) {
  const [draft, setDraft] = useState<QuoteDraftInput>(() =>
    quote
      ? {
          ...quote.input,
          items: quote.input.items?.map((i) => ({
            ...i,
            lineId: i.lineId ?? crypto.randomUUID(),
          })),
        }
      : { discount: "0.00", shipping: "0.00", internalNotes: "" },
  );
  const [bindings, setBindings] = useState<LineCostBinding[]>(
    quote?.costs?.bindings ?? [],
  );
  const [snapshots, setSnapshots] = useState<PricingSnapshotDTO[]>(
    quote?.costs?.snapshots ?? [],
  );
  const outgoing = bindings
    .filter((b) => draft.items?.some((i) => i.lineId === b.lineId))
    .map(({ lineId, snapshotId }) => ({ lineId, snapshotId }));
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const exit = useDocumentExit(JSON.stringify({ draft, bindings }));
  const pending = useRef(false);
  const [kitEdited, setKitEdited] = useState(false),
    [reviewedKitFingerprint, setReviewedKitFingerprint] = useState<string>();
  let kitFingerprint: string | undefined;
  if (draft.catalogKits)
    try {
      kitFingerprint = discountReviewFingerprint(
        draft.items ?? [],
        draft.discount ?? "0.00",
      );
    } catch {}
  function update(patch: QuoteDraftInput) {
    if (
      draft.catalogKits &&
      (patch.items !== undefined || patch.discount !== undefined)
    ) {
      let changed = true;
      try {
        changed =
          discountReviewFingerprint(
            patch.items ?? draft.items ?? [],
            patch.discount ?? draft.discount ?? "0.00",
          ) !==
          discountReviewFingerprint(
            draft.items ?? [],
            draft.discount ?? "0.00",
          );
      } catch {}
      if (changed) {
        setKitEdited(true);
        setReviewedKitFingerprint(undefined);
      }
    }
    setDraft((old) => ({ ...old, ...patch }));
  }
  let total = "—";
  try {
    total = calculateDocumentTotals(
      draft.items ?? [],
      draft.discount ?? "0",
      draft.shipping ?? "0",
    ).total;
  } catch {}
  async function save(e: FormEvent) {
    e.preventDefault();
    if (pending.current) return;
    setError("");
    const parsed = quoteDraftSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    if (
      draft.catalogKits &&
      kitEdited &&
      (!kitFingerprint || reviewedKitFingerprint !== kitFingerprint)
    ) {
      setError(
        "Confirme a revisão do desconto para as linhas e os preços atuais.",
      );
      return;
    }
    const kitDiscountReview =
      draft.catalogKits && kitEdited && kitFingerprint
        ? { fingerprint: kitFingerprint }
        : undefined;
    pending.current = true;
    setBusy(true);
    try {
      if (saveDraft) {
        await saveDraft(parsed.data, outgoing, kitDiscountReview);
        exit.markSaved();
        return;
      }
      const saved = await api<QuoteDTO>(
        quote ? `/api/quotes/${quote.id}` : "/api/quotes",
        {
          ...parsed.data,
          costBindings: outgoing,
          ...(kitDiscountReview ? { kitDiscountReview } : {}),
          ...(quote ? { expectedVersion: quote.version } : {}),
        },
        quote ? "PUT" : "POST",
      );
      exit.markSaved();
      onSaved(saved);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <AdminForm onSubmit={save} className="commerce-form">
      <h2>{title ?? (quote ? "Editar orçamento" : "Novo orçamento")}</h2>
      <fieldset disabled={busy} className="contents">
        <TaskLayout
          summary={
            <section className="admin-summary-card">
              <h3>Resumo do documento</h3>
              <dl>
                <dt>Itens</dt>
                <dd>{draft.items?.length ?? 0}</dd>
                <dt>Desconto</dt>
                <dd>R$ {draft.discount || "0,00"}</dd>
                <dt>Frete</dt>
                <dd>R$ {draft.shipping || "0,00"}</dd>
                <dt>Total</dt>
                <dd>R$ {total}</dd>
              </dl>
              <p className="admin-form-note">
                Rascunho: os dados completos serão exigidos ao confirmar.
              </p>
              <FormActions>
                <Button
                  variant="default"
                  size="sm"
                  className=""
                  disabled={busy}
                >
                  {busy ? "Salvando…" : "Salvar rascunho"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className=""
                  disabled={busy}
                  onClick={() => {
                    if (exit.allowExit()) onCancel();
                  }}
                >
                  Cancelar
                </Button>
              </FormActions>
            </section>
          }
        >
          <CatalogOrigins items={draft.items ?? []} />
          {error && <Notice>{error}</Notice>}
          <FormSection
            id="document-customer"
            title={
              saveDraft ? "Identificação do cliente" : "Cliente e validade"
            }
          >
            <Label>
              Cliente
              <NativeSelect
                value={draft.customerId ?? ""}
                onChange={(e) =>
                  update({ customerId: e.target.value || undefined })
                }
              >
                <option value="">Selecionar depois</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id} disabled={!c.active}>
                    {c.name}
                    {c.active ? "" : " (inativo)"}
                  </option>
                ))}
              </NativeSelect>
            </Label>
            {!saveDraft && (
              <Field
                label="Válido até"
                type="date"
                value={draft.validUntil ?? ""}
                onChange={(e) =>
                  update({ validUntil: e.target.value || undefined })
                }
              />
            )}
          </FormSection>
          <FormSection id="document-items" title="Itens e valores">
            <DocumentItems
              items={draft.items ?? []}
              products={products}
              renderPrivate={(item, index) => {
                const binding = bindings.find((b) => b.lineId === item.lineId),
                  snapshot = snapshots.find(
                    (s) => s.id === binding?.snapshotId,
                  );
                return (
                  <LinePricingControls
                    item={item}
                    binding={binding}
                    snapshot={snapshot}
                    onAttach={(s) => {
                      setSnapshots((old) => [
                        ...old.filter((x) => x.id !== s.id),
                        s,
                      ]);
                      setBindings((old) => [
                        ...old.filter((b) => b.lineId !== item.lineId),
                        {
                          lineId: item.lineId!,
                          snapshotId: s.id,
                          fingerprint: lineFingerprint(item),
                          state: "VALID",
                        },
                      ]);
                    }}
                    onRemove={() =>
                      setBindings((old) =>
                        old.filter((b) => b.lineId !== item.lineId),
                      )
                    }
                    onPrice={(unitPrice) =>
                      update({
                        items: draft.items!.map((i, j) =>
                          j === index ? { ...i, unitPrice } : i,
                        ),
                      })
                    }
                  />
                );
              }}
              onChange={(items) =>
                update({
                  items: items.length || draft.catalogKits ? items : undefined,
                })
              }
            />
            <div className="form-grid">
              <Field
                label="Desconto (R$)"
                inputMode="decimal"
                value={draft.discount ?? ""}
                onChange={(e) => update({ discount: e.target.value })}
              />
              <Field
                label="Frete (R$)"
                inputMode="decimal"
                value={draft.shipping ?? ""}
                onChange={(e) => update({ shipping: e.target.value })}
              />
            </div>
            {draft.catalogKits && (
              <>
                <KitDocumentHistory value={draft.catalogKits} />
                {kitEdited && (
                  <label className="flex min-h-11 items-center gap-3">
                    <Checkbox
                      checked={
                        !!kitFingerprint &&
                        reviewedKitFingerprint === kitFingerprint
                      }
                      disabled={!kitFingerprint || busy}
                      onChange={(e) =>
                        setReviewedKitFingerprint(
                          e.target.checked ? kitFingerprint : undefined,
                        )
                      }
                    />
                    Revisei o desconto deste documento
                  </label>
                )}
              </>
            )}
            {bindings.length > 0 &&
              ((Number(draft.discount?.replace(",", ".")) || 0) > 0 ||
                (Number(draft.shipping?.replace(",", ".")) || 0) > 0) && (
                <p className="no-print">
                  resultado global não apurado nesta etapa
                </p>
              )}
            <p>
              <strong>Total: R$ {total}</strong>
            </p>
          </FormSection>
          <FormSection
            id="document-conditions"
            title="Pagamento e notas internas"
            collapsible
            defaultOpen={false}
            hasErrors={!!error}
            summary={
              draft.paymentTerms
                ? "Condições preenchidas"
                : "Pode preencher antes de confirmar"
            }
          >
            <Label>
              Condições de pagamento
              <Textarea
                maxLength={2000}
                value={draft.paymentTerms ?? ""}
                onChange={(e) =>
                  update({ paymentTerms: e.target.value || undefined })
                }
              />
            </Label>
            <Label>
              Notas internas
              <Textarea
                maxLength={2000}
                value={draft.internalNotes ?? ""}
                onChange={(e) => update({ internalNotes: e.target.value })}
              />
            </Label>
          </FormSection>
          <p>
            {saveDraft
              ? "A venda será salva como rascunho. Revise o parcelamento antes de confirmar."
              : "Salvar mantém o rascunho. A emissão exige cliente, itens, validade e condições de pagamento."}
          </p>
        </TaskLayout>
      </fieldset>
    </AdminForm>
  );
}
