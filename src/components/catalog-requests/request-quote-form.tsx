"use client";
import { useRef, useState } from "react";
import { Field, Notice } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/customers/customer-form";
import { api } from "@/lib/client-api";
import { quoteSchema } from "@/domain/commerce/validation";
import type { CustomerDTO } from "@/domain/customers/types";
import type { CatalogRequestDTO } from "@/domain/catalog-requests/types";
export function RequestQuoteForm({
  request,
  initialCustomers,
  onPrepared,
  onCancel,
}: {
  request: CatalogRequestDTO;
  initialCustomers: CustomerDTO[];
  onPrepared: (request: CatalogRequestDTO) => void;
  onCancel: () => void;
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [paymentTerms, setPaymentTerms] = useState(
    request.lines.every(
      (line) => line.paymentTerms === request.lines[0]?.paymentTerms,
    )
      ? (request.lines[0]?.paymentTerms ?? "")
      : "",
  );
  const [discount, setDiscount] = useState("0.00"),
    [shipping, setShipping] = useState("0.00");
  const [internalNotes, setInternalNotes] = useState("");
  const [lines, setLines] = useState(() =>
    request.lines.map((line) => ({
      lineId: crypto.randomUUID(),
      sourceLineId: line.lineId,
      description: [
        line.name,
        line.color && `Cor: ${line.color}`,
        line.size && `Tamanho: ${line.size}`,
        ...line.answerLabels.map((a) => `${a.label}: ${a.valueLabel}`),
      ]
        .filter(Boolean)
        .join(" · "),
      quantity: line.quantity,
      unitPrice: line.unitPrice ?? "",
      standalone: false,
    })),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  async function findCustomers() {
    try {
      const found = await api<CustomerDTO[]>(
        `/api/requests/${request.id}/customers?search=${encodeURIComponent(search)}`,
      );
      setCustomers((old) => [
        ...old,
        ...found.filter(
          (row) => !old.some((previous) => previous.id === row.id),
        ),
      ]);
      if (!found.length)
        setError(
          "Nenhum cliente encontrado. Revise a busca ou cadastre conscientemente um cliente.",
        );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function prepare(e: React.FormEvent) {
    e.preventDefault();
    if (pending.current) return;
    setError("");
    const items = lines.map((line) => {
      const source = request.lines.find((s) => s.lineId === line.sourceLineId)!;
      const active = request.currentProducts.some(
        (p) => p.id === source.productId && p.active,
      );
      return {
        lineId: line.lineId,
        ...(active || !line.standalone ? { productId: source.productId } : {}),
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      };
    });
    const parsed = quoteSchema.safeParse({
      customerId,
      validUntil,
      paymentTerms,
      discount,
      shipping,
      internalNotes,
      items,
    });
    if (!parsed.success) {
      setError(
        "Revise o cliente, a validade, as descrições (até 1.000 caracteres) e informe um preço positivo para cada linha, inclusive sob consulta.",
      );
      const issue = parsed.error.issues[0];
      const control = form.current?.elements.namedItem(issue.path.join("."));
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    const missing = lines.find(
      (line) =>
        !request.currentProducts.some(
          (p) =>
            p.id ===
              request.lines.find((s) => s.lineId === line.sourceLineId)
                ?.productId && p.active,
        ) && !line.standalone,
    );
    if (missing) {
      setError(
        "Confirme explicitamente as linhas de produtos retirados como itens avulsos.",
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const result = await api<{ request: CatalogRequestDTO }>(
        `/api/requests/${request.id}/prepare-quote`,
        {
          expectedVersion: request.version,
          document: parsed.data,
          sources: lines.map(({ lineId, sourceLineId, standalone }) => ({
            lineId,
            sourceLineId,
            standalone,
          })),
        },
      );
      onPrepared(result.request);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="request-quote">
      <h2>Revisar e preparar orçamento</h2>
      <p>
        Os possíveis clientes são sugestões. Confira o contato e escolha um
        cadastro; nenhuma correspondência foi vinculada automaticamente.
      </p>
      {error && <Notice>{error}</Notice>}
      <div className="form-grid">
        <Field
          label="Buscar cliente por nome, e-mail ou telefone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="button" variant="outline" onClick={findCustomers}>
          Buscar cliente
        </Button>
      </div>
      <Button type="button" variant="outline" onClick={() => setCreating(true)}>
        Cadastrar cliente revisado
      </Button>
      {creating && (
        <CustomerForm
          onCancel={() => setCreating(false)}
          onSaved={(customer) => {
            setCustomers((old) => [...old, customer]);
            setCustomerId(customer.id);
            setCreating(false);
          }}
        />
      )}
      <form ref={form} onSubmit={prepare} className="commerce-form" noValidate>
        <Label>
          Cliente revisado
          <NativeSelect
            name="customerId"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Selecione conscientemente</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.phone || c.email}
              </option>
            ))}
          </NativeSelect>
        </Label>
        {lines.map((line, index) => {
          const source = request.lines.find(
            (s) => s.lineId === line.sourceLineId,
          )!;
          const active = request.currentProducts.some(
            (p) => p.id === source.productId && p.active,
          );
          const update = (patch: Partial<typeof line>) =>
            setLines((old) =>
              old.map((row) =>
                row.lineId === line.lineId ? { ...row, ...patch } : row,
              ),
            );
          return (
            <fieldset key={line.lineId} className="commerce-item">
              <legend>
                Linha recebida {index + 1} — {source.name}
              </legend>
              <Label>
                Descrição comercial {index + 1}
                <Textarea
                  name={`items.${index}.description`}
                  value={line.description}
                  maxLength={1000}
                  onChange={(e) => update({ description: e.target.value })}
                  aria-invalid={line.description.length > 1000}
                />
              </Label>
              <p>
                {line.description.length}/1.000 caracteres. A configuração
                completa recebida será preservada.
              </p>
              <Field
                name={`items.${index}.quantity`}
                label={`Quantidade ${index + 1}`}
                type="number"
                min={1}
                max={100000}
                value={line.quantity}
                onChange={(e) => update({ quantity: Number(e.target.value) })}
              />
              <Field
                name={`items.${index}.unitPrice`}
                label={`Preço unitário ${index + 1}`}
                inputMode="decimal"
                value={line.unitPrice}
                onChange={(e) => update({ unitPrice: e.target.value })}
                hint={
                  source.priceKind === "CONSULT"
                    ? "Sob consulta: informe o valor revisado."
                    : "Confirme ou ajuste a referência recebida."
                }
              />
              {!active && (
                <Label>
                  <input
                    type="checkbox"
                    checked={line.standalone}
                    onChange={(e) => update({ standalone: e.target.checked })}
                  />
                  Preparar linha {index + 1} como item avulso; produto retirado
                  do catálogo
                </Label>
              )}
            </fieldset>
          );
        })}
        <div className="form-grid">
          <Field
            name="discount"
            label="Desconto (R$)"
            inputMode="decimal"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <Field
            name="shipping"
            label="Frete (R$)"
            inputMode="decimal"
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
          />
          <Field
            name="validUntil"
            label="Validade do orçamento"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
        <Label>
          Condições de pagamento
          <Textarea
            name="paymentTerms"
            value={paymentTerms}
            maxLength={2000}
            onChange={(e) => setPaymentTerms(e.target.value)}
          />
        </Label>
        <Label>
          Notas internas do orçamento
          <Textarea
            name="internalNotes"
            value={internalNotes}
            maxLength={2000}
            onChange={(e) => setInternalNotes(e.target.value)}
          />
        </Label>
        <p>
          O documento será criado como rascunho. Não será emitido nem enviado ao
          cliente automaticamente.
        </p>
        <div className="form-actions">
          <Button type="submit" disabled={busy}>
            {busy ? "Preparando…" : "Preparar orçamento"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar preparação
          </Button>
        </div>
      </form>
    </section>
  );
}
