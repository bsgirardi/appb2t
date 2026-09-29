"use client";
import { useRef, useState, type FormEvent } from "react";
import type { CustomerDTO, CustomerInput } from "@/domain/customers/types";
import { customerSchema } from "@/domain/customers/validation";
import { api } from "@/lib/client-api";
import { Field, Notice } from "@/components/ui/field";
export function CustomerForm({
  customer,
  onSaved,
  onCancel,
}: {
  customer?: CustomerDTO;
  onSaved: (c: CustomerDTO) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<CustomerInput>(() =>
    customer
      ? {
          name: customer.name,
          type: customer.type,
          document: customer.document,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          notes: customer.notes,
          active: customer.active,
        }
      : {
          name: "",
          type: "PERSON",
          document: "",
          email: "",
          phone: "",
          address: "",
          notes: "",
          active: true,
        },
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (pending.current) return;
    setError("");
    const parsed = customerSchema.safeParse(draft);
    if (!parsed.success) {
      setError("Confira nome, e-mail e os demais campos do cliente.");
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      onSaved(
        await api<CustomerDTO>(
          customer ? `/api/customers/${customer.id}` : "/api/customers",
          {
            ...parsed.data,
            ...(customer ? { expectedVersion: customer.version } : {}),
          },
          customer ? "PUT" : "POST",
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
    <form onSubmit={save} className="card product-form">
      {error && <Notice>{error}</Notice>}
      <fieldset disabled={busy}>
        <Field
          label="Nome do cliente"
          value={draft.name}
          maxLength={160}
          required
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <div className="field">
          <label htmlFor="customer-type">Tipo de cliente</label>
          <select
            id="customer-type"
            value={draft.type}
            onChange={(e) =>
              setDraft({
                ...draft,
                type: e.target.value as CustomerInput["type"],
              })
            }
          >
            <option value="PERSON">Pessoa física</option>
            <option value="COMPANY">Pessoa jurídica</option>
          </select>
        </div>
        <div className="form-grid">
          {(
            [
              ["document", "Documento", 32],
              ["email", "E-mail", 254],
              ["phone", "Telefone", 50],
              ["address", "Endereço", 500],
            ] as const
          ).map(([key, label, max]) => (
            <Field
              key={key}
              label={label}
              value={draft[key]}
              maxLength={key === "document" ? 100 : max}
              type={key === "email" ? "email" : "text"}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          ))}
        </div>
        <p className="muted">
          Documento opcional, informado pela equipe. Sem validação fiscal
          externa.
        </p>
        <div className="field">
          <label htmlFor="customer-notes">Observações internas</label>
          <textarea
            id="customer-notes"
            value={draft.notes}
            maxLength={2000}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </div>
        <label className="product-checkbox">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          />
          Cliente ativo
        </label>
        <div className="product-actions">
          <button type="submit" className="button primary">
            {busy ? "Salvando…" : "Salvar cliente"}
          </button>
          <button type="button" className="button secondary" onClick={onCancel}>
            Voltar
          </button>
        </div>
      </fieldset>
    </form>
  );
}
