"use client";
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
            <button
              className="button secondary"
              onClick={() => setEditing(true)}
            >
              Editar rascunho
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => transition("ISSUE")}
            >
              Emitir orçamento
            </button>
          </>
        )}
        {quote.status === "ENVIADO" && (
          <>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => transition("APPROVE")}
            >
              Registrar aprovação
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => transition("REJECT")}
            >
              Registrar recusa
            </button>
          </>
        )}
        {!["RASCUNHO", "CONVERTIDO"].includes(quote.status) && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => transition("REOPEN")}
          >
            Reabrir para editar
          </button>
        )}
        {quote.snapshot && (
          <Link
            className="button secondary"
            href={`/orcamentos/${quote.id}/imprimir`}
          >
            Versão para impressão
          </Link>
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
      {quote.snapshot && quote.totals ? (
        <DocumentPrint
          number={quote.number}
          snapshot={quote.snapshot}
          totals={quote.totals}
          paymentTerms={quote.input.paymentTerms ?? ""}
          validUntil={quote.input.validUntil}
        />
      ) : (
        <div className="card">
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
      )}
      {quote.input.internalNotes && (
        <section className="card">
          <h2>Notas internas</h2>
          <p className="preserve-lines">{quote.input.internalNotes}</p>
        </section>
      )}
      <section className="card">
        <h2>Histórico</h2>
        <ul>
          {quote.events.map((e) => (
            <li key={e.id}>
              {new Date(e.createdAt).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}{" "}
              · {e.action} · {e.actorName}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
