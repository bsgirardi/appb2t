"use client";
import { FormSection } from "@/components/admin/form-section";

import {
  DocumentCostSummary,
  currentBindingState,
} from "@/components/pricing/line-cost-summary";
import { Card } from "@/components/ui/card";
import { KitDocumentHistory } from "./kit-document-history";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { QuoteDTO, SaleDTO } from "@/domain/commerce/types";
import { InstallmentEditor } from "./installment-editor";
import type { CustomerDTO } from "@/domain/customers/types";
import { api } from "@/lib/client-api";
import { Notice } from "@/components/ui/field";
import { QuoteForm } from "./quote-form";
import { DocumentPrint } from "./document-print";
import type { CommercialProduct } from "./document-items";
import { CatalogOrigins } from "./catalog-origin";
import { DocumentArt } from "@/components/art/document-art";
export function QuoteDetail({
  initial,
  customers,
  products,
}: {
  initial: QuoteDTO;
  customers: CustomerDTO[];
  products: CommercialProduct[];
}) {
  const router = useRouter(),
    [quote, setQuote] = useState(initial),
    [editing, setEditing] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const stale =
    quote.costs?.bindings.some((b) => {
      const item = quote.input.items?.find((i) => i.lineId === b.lineId);
      return !item || currentBindingState(item, b) === "STALE";
    }) ?? false;
  async function transition(action: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      setQuote(
        await api<QuoteDTO>(`/api/quotes/${quote.id}/transition`, {
          action,
          expectedVersion: quote.version,
        }),
      );
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="commerce-page">
      <Link href="/orcamentos">← Orçamentos</Link>
      <h1>{quote.number}</h1>
      <DocumentArt items={quote.input.items ?? []} art={quote.art} />
      <CatalogOrigins
        items={quote.snapshot?.items ?? quote.input.items ?? []}
      />
      <p>
        Estado: <strong>{quote.status}</strong>
      </p>
      {error && <Notice>{error}</Notice>}
      {quote.saleId && (
        <Link href={`/vendas/${quote.saleId}`}>Abrir venda vinculada</Link>
      )}
      <div className="form-actions">
        {quote.status === "RASCUNHO" && (
          <>
            <Button
              variant="outline"
              size="sm"
              className=""
              onClick={() => setEditing(true)}
            >
              Editar rascunho
            </Button>
            <Button
              variant="default"
              size="sm"
              className=""
              disabled={busy || stale}
              onClick={() => transition("ISSUE")}
            >
              Emitir orçamento
            </Button>
          </>
        )}
        {quote.status === "ENVIADO" && (
          <>
            <Button
              variant="default"
              size="sm"
              className=""
              disabled={busy}
              onClick={() => transition("APPROVE")}
            >
              Registrar aprovação
            </Button>
            <Button
              variant="outline"
              size="sm"
              className=""
              disabled={busy}
              onClick={() => transition("REJECT")}
            >
              Registrar recusa
            </Button>
          </>
        )}
        {!["RASCUNHO", "CONVERTIDO"].includes(quote.status) && (
          <Button
            variant="outline"
            size="sm"
            className=""
            disabled={busy}
            onClick={() => transition("REOPEN")}
          >
            Reabrir para editar
          </Button>
        )}
        {quote.snapshot && (
          <Button asChild variant="outline">
            <Link href={`/orcamentos/${quote.id}/imprimir`}>
              Versão para impressão
            </Link>
          </Button>
        )}
      </div>
      <p>
        Emissão e aprovação são registros internos. Nenhuma mensagem é enviada
        automaticamente.
      </p>
      {quote.status === "APROVADO" && quote.totals && (
        <InstallmentEditor
          total={quote.totals.total}
          onConfirm={async (installments, operationKey) => {
            const sale = await api<SaleDTO>(`/api/quotes/${quote.id}/convert`, {
              expectedVersion: quote.version,
              installments,
              operationKey,
            });
            router.push(`/vendas/${sale.id}`);
            router.refresh();
          }}
        />
      )}
      {editing && (
        <QuoteForm
          quote={quote}
          customers={customers}
          products={products}
          onCancel={() => setEditing(false)}
          onSaved={(q) => {
            setQuote(q);
            setEditing(false);
            router.refresh();
          }}
        />
      )}
      <DocumentCostSummary
        items={quote.input.items ?? []}
        costs={quote.costs}
        discount={quote.input.discount}
        shipping={quote.input.shipping}
      />
      {quote.snapshot && quote.totals ? (
        <DocumentPrint
          number={quote.number}
          snapshot={quote.snapshot}
          totals={quote.totals}
          paymentTerms={quote.input.paymentTerms ?? ""}
          validUntil={quote.input.validUntil}
        />
      ) : (
        <Card asChild>
          <div className="">
            <p>
              Cliente:{" "}
              {customers.find((c) => c.id === quote.input.customerId)?.name ??
                "Não informado"}
            </p>
            <p>
              {quote.input.items?.length ?? 0} item(ns) · Total: R${" "}
              {quote.totals?.total ?? "—"}
            </p>
          </div>
        </Card>
      )}
      {quote.input.internalNotes && (
        <Card asChild>
          <section className="">
            <h2>Notas internas</h2>
            <p className="preserve-lines">{quote.input.internalNotes}</p>
          </section>
        </Card>
      )}
      <FormSection
        id="quote-history"
        title="Histórico do orçamento"
        collapsible
        defaultOpen={false}
        summary={`${quote.events.length} registros`}
      >
        {quote.input.catalogKits && (
          <KitDocumentHistory value={quote.input.catalogKits} />
        )}
        <ul>
          {quote.events.map((e) => (
            <li key={e.id}>
              {new Date(e.createdAt).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}{" "}
              ·{" "}
              {e.action === "KIT_DISCOUNT_REVIEW"
                ? "Desconto revisado"
                : e.action}{" "}
              · {e.actorName}
            </li>
          ))}
        </ul>
      </FormSection>
    </div>
  );
}
