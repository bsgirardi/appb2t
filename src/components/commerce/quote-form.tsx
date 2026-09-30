"use client";
import { useRef, useState, type FormEvent } from "react";
import type { QuoteDTO, QuoteDraftInput } from "@/domain/commerce/types";
import type { CustomerDTO } from "@/domain/customers/types";
import { quoteDraftSchema } from "@/domain/commerce/validation";
import { calculateDocumentTotals } from "@/domain/commerce/totals";
import { api } from "@/lib/client-api";
import { Notice, Field } from "@/components/ui/field";
import { DocumentItems, type CommercialProduct } from "./document-items";
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
  saveDraft?: (draft: QuoteDraftInput) => Promise<void>;
  title?: string;
}) {
  const [draft, setDraft] = useState<QuoteDraftInput>(
    quote?.input ?? { discount: "0.00", shipping: "0.00", internalNotes: "" },
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false);
  function update(patch: QuoteDraftInput) {
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
    pending.current = true;
    setBusy(true);
    try {
      if (saveDraft) {
        await saveDraft(parsed.data);
        return;
      }
      onSaved(
        await api<QuoteDTO>(
          quote ? `/api/quotes/${quote.id}` : "/api/quotes",
          {
            ...parsed.data,
            ...(quote ? { expectedVersion: quote.version } : {}),
          },
          quote ? "PUT" : "POST",
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="commerce-form">
      <h2>{title ?? (quote ? "Editar orçamento" : "Novo orçamento")}</h2>
      {error && <Notice>{error}</Notice>}
      <label>
        Cliente
        <select
          value={draft.customerId ?? ""}
          onChange={(e) => update({ customerId: e.target.value || undefined })}
        >
          <option value="">Selecionar depois</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id} disabled={!c.active}>
              {c.name}
              {c.active ? "" : " (inativo)"}
            </option>
          ))}
        </select>
      </label>
      {!saveDraft && (
        <Field
          label="Válido até"
          type="date"
          value={draft.validUntil ?? ""}
          onChange={(e) => update({ validUntil: e.target.value || undefined })}
        />
      )}
      <DocumentItems
        items={draft.items ?? []}
        products={products}
        onChange={(items) =>
          update({ items: items.length ? items : undefined })
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
      <p>
        <strong>Total: R$ {total}</strong>
      </p>
      <label>
        Condições de pagamento
        <textarea
          maxLength={2000}
          value={draft.paymentTerms ?? ""}
          onChange={(e) =>
            update({ paymentTerms: e.target.value || undefined })
          }
        />
      </label>
      <label>
        Notas internas
        <textarea
          maxLength={2000}
          value={draft.internalNotes ?? ""}
          onChange={(e) => update({ internalNotes: e.target.value })}
        />
      </label>
      <p>
        {saveDraft
          ? "A venda será salva como rascunho. Revise o parcelamento antes de confirmar."
          : "Salvar mantém o rascunho. A emissão exige cliente, itens, validade e condições de pagamento."}
      </p>
      <div className="form-actions">
        <button className="button primary" disabled={busy}>
          {busy ? "Salvando…" : "Salvar rascunho"}
        </button>
        <button type="button" className="button secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
