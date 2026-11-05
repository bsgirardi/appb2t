"use client";
import { FormActions } from "@/components/admin/form-actions";
import { FormSection } from "@/components/admin/form-section";

import { AdminForm } from "@/components/admin/admin-form";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
    <Card asChild>
      <AdminForm onSubmit={save} className="product-form" aria-busy={busy}>
        <fieldset disabled={busy}>
          <legend className="sr-only">Dados do cliente</legend>
          <FormSection
            id="customer-identity"
            title="Identificação"
            description="Nome e tipo usados nos orçamentos e vendas."
          >
            <Field
              label="Nome do cliente"
              value={draft.name}
              maxLength={160}
              required
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <div className="field">
              <Label htmlFor="customer-type">Tipo de cliente</Label>
              <NativeSelect
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
              </NativeSelect>
            </div>
            <Field
              label="Documento"
              value={draft.document}
              maxLength={100}
              hint="Opcional, informado pela equipe. Sem validação fiscal externa."
              onChange={(e) => setDraft({ ...draft, document: e.target.value })}
            />
          </FormSection>
          <FormSection
            id="customer-contact"
            title="Contato"
            description="Informações opcionais para localizar e atender o cliente."
          >
            <div className="form-grid">
              {(
                [
                  ["email", "E-mail", 254],
                  ["phone", "Telefone", 50],
                  ["address", "Endereço", 500],
                ] as const
              ).map(([key, label, max]) => (
                <Field
                  key={key}
                  label={label}
                  value={draft[key]}
                  maxLength={max}
                  type={
                    key === "email" ? "email" : key === "phone" ? "tel" : "text"
                  }
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                />
              ))}
            </div>
          </FormSection>
          <FormSection
            id="customer-extra"
            title="Observações e situação"
            collapsible
            defaultOpen={false}
            hasErrors={!!error}
            summary="Opcional"
          >
            <div className="field">
              <Label htmlFor="customer-notes">Observações internas</Label>
              <Textarea
                id="customer-notes"
                value={draft.notes}
                maxLength={2000}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
            <Label className="product-checkbox">
              <Checkbox
                checked={draft.active}
                onChange={(e) =>
                  setDraft({ ...draft, active: e.target.checked })
                }
              />
              Cliente ativo
            </Label>
          </FormSection>
          <section
            aria-label="Conferir cliente"
            className="rounded-lg border border-border bg-muted/40 p-4 flex flex-col gap-2 break-words"
          >
            <h2 className="font-semibold">Conferir antes de salvar</h2>
            <p>
              {draft.name.trim() || "Nome ainda não informado"} ·{" "}
              {draft.type === "PERSON" ? "Pessoa física" : "Pessoa jurídica"} ·{" "}
              {draft.active ? "Ativo" : "Inativo"}
            </p>
            <p className="text-muted-foreground">
              {draft.email || draft.phone || "Contato não informado"}
            </p>
          </section>
          {error && <Notice>{error}</Notice>}
          <span role="status" className="sr-only">
            {busy ? "Salvando cliente…" : ""}
          </span>
          <FormActions>
            <Button variant="default" size="sm" type="submit" className="">
              {busy ? "Salvando…" : "Salvar cliente"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              className=""
              data-cancel-editor
              onClick={onCancel}
            >
              Voltar
            </Button>
          </FormActions>
        </fieldset>
      </AdminForm>
    </Card>
  );
}
