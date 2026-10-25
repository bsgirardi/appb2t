"use client";
import { AdminForm } from "@/components/admin/admin-form";
import { useRef, useState } from "react";
import { receivedArtDescription } from "@/domain/art/configuration";
import { Field, Notice } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Decimal from "decimal.js";
import { formatBRL } from "@/domain/calculation/calculate";
import {
  calculatePreparedKitDiscount,
  kitPreparationReview,
} from "@/domain/kits/document";
import { CustomerForm } from "@/components/customers/customer-form";
import { api } from "@/lib/client-api";
import { quoteSchema, moneySchema } from "@/domain/commerce/validation";
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
      description: receivedArtDescription(line),
      quantity: line.quantity,
      unitPrice: line.unitPrice ?? "",
      standalone: false,
    })),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const [reviewedFingerprint, setReviewedFingerprint] = useState<string>();
  const hasKits = !!request.groups?.length;
  const previewItems = lines.map((line) => {
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
  const sources = lines.map(({ lineId, sourceLineId, standalone }) => ({
    lineId,
    sourceLineId,
    standalone,
  }));
  let globalDiscount = discount,
    kitDiscount = "0.00",
    fingerprint: string | undefined,
    kitError = "",
    kitCalculations: ReturnType<typeof calculatePreparedKitDiscount>["groups"] =
      [];
  if (hasKits)
    try {
      const calculation = calculatePreparedKitDiscount(
        request.groups!,
        previewItems,
        sources,
      );
      kitCalculations = calculation.groups;
      kitDiscount = calculation.discount;
      globalDiscount = new Decimal(kitDiscount)
        .plus(moneySchema.parse(discount))
        .toFixed(2);
      const subtotal = previewItems.reduce(
        (s, i) =>
          s.plus(new Decimal(i.unitPrice.replace(",", ".")).times(i.quantity)),
        new Decimal(0),
      );
      if (new Decimal(globalDiscount).gte(subtotal))
        throw new Error("O desconto global deve ser menor que o subtotal.");
      fingerprint = kitPreparationReview(previewItems, sources, globalDiscount);
    } catch {
      kitError =
        "Informe preços positivos e quantidades de 1 a 99 nos componentes; confira os descontos para continuar.";
    }
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
    if (
      hasKits &&
      (kitError || !fingerprint || reviewedFingerprint !== fingerprint)
    ) {
      setError(
        kitError ||
          "Confirme a revisão dos preços, das quantidades e dos descontos dos kits.",
      );
      return;
    }
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
      discount: globalDiscount,
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
          ...(hasKits
            ? {
                additionalDiscount: moneySchema.parse(discount),
                kitReviewFingerprint: fingerprint,
              }
            : {}),
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
      <AdminForm
        ref={form}
        onSubmit={prepare}
        className="commerce-form"
        noValidate
      >
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
          const update = (patch: Partial<typeof line>) => {
            setReviewedFingerprint(undefined);
            setLines((old) =>
              old.map((row) =>
                row.lineId === line.lineId ? { ...row, ...patch } : row,
              ),
            );
          };
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
                max={source.kitInstanceId ? 99 : 100000}
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
            label={
              hasKits ? "Desconto comercial adicional (R$)" : "Desconto (R$)"
            }
            inputMode="decimal"
            value={discount}
            onChange={(e) => {
              setReviewedFingerprint(undefined);
              setDiscount(e.target.value);
            }}
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
        {hasKits && (
          <section
            className="flex flex-col gap-3"
            aria-label="Revisão dos descontos de kits"
          >
            <h3>Descontos de kits</h3>
            <p>
              Os preços unitários mostram a base e os adicionais, antes do
              desconto. As faixas recebidas são usadas neste cálculo, sem
              acumular faixas individuais.
            </p>
            {kitError ? (
              <Notice>{kitError}</Notice>
            ) : (
              <>
                {kitCalculations.map((calculation) => {
                  const group = request.groups!.find(
                    (g) => g.instanceId === calculation.instanceId,
                  )!;
                  return (
                    <div key={group.instanceId}>
                      <strong>{group.name}</strong>
                      <p>
                        {calculation.quantity} unidades; soma{" "}
                        {formatBRL(calculation.subtotal)}; desconto{" "}
                        {formatBRL(calculation.discount)}; referência líquida{" "}
                        {formatBRL(calculation.total)}.
                      </p>
                      {JSON.stringify(calculation.tier) !==
                        JSON.stringify(group.price.tier) ||
                      calculation.total !== group.price.total ? (
                        <p>
                          O cálculo revisado difere da referência recebida.
                          Confira os valores e a faixa.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
                <p>
                  Descontos dos kits: {formatBRL(kitDiscount)}. Desconto global:{" "}
                  {formatBRL(globalDiscount)}.
                </p>
              </>
            )}
            <label className="flex min-h-11 items-center gap-3">
              <Checkbox
                checked={!!fingerprint && reviewedFingerprint === fingerprint}
                disabled={!!kitError || busy}
                onChange={(e) =>
                  setReviewedFingerprint(
                    e.target.checked ? fingerprint : undefined,
                  )
                }
              />
              Revisei os preços, as quantidades e os descontos dos kits
            </label>
          </section>
        )}
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
      </AdminForm>
    </section>
  );
}
