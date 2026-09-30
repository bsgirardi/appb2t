"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { SaleDTO, SaleStatus } from "@/domain/commerce/types";
import type { CustomerDTO } from "@/domain/customers/types";
import { api } from "@/lib/client-api";
import { Notice, Field } from "@/components/ui/field";
import { SaleForm } from "./sale-form";
import { InstallmentEditor } from "./installment-editor";
import { DocumentPrint } from "./document-print";
import type { CommercialProduct } from "./document-items";
export function SaleDetail({
  initial,
  customers,
  products,
}: {
  initial: SaleDTO;
  customers: CustomerDTO[];
  products: CommercialProduct[];
}) {
  const router = useRouter(),
    [sale, setSale] = useState(initial),
    [editing, setEditing] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [notes, setNotes] = useState(initial.operationalNotes),
    [delivery, setDelivery] = useState(initial.expectedDeliveryDate ?? "");
  const pending = useRef(false);
  const next: Partial<Record<SaleStatus, SaleStatus>> = {
    CONFIRMADA: "EM_PRODUCAO",
    EM_PRODUCAO: "PRONTA",
    PRONTA: "ENTREGUE",
  };
  const labels: Record<string, string> = {
    EM_PRODUCAO: "Iniciar produção",
    PRONTA: "Marcar como pronta",
    ENTREGUE: "Registrar entrega",
  };
  function saved(s: SaleDTO) {
    setSale(s);
    setEditing(false);
    router.refresh();
  }
  async function change(status: SaleStatus) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      saved(
        await api<SaleDTO>(`/api/sales/${sale.id}/transition`, {
          expectedVersion: sale.version,
          status,
          ...(status === "CANCELADA" ? { reason } : {}),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function operations() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      saved(
        await api<SaleDTO>(
          `/api/sales/${sale.id}`,
          {
            expectedVersion: sale.version,
            expectedDeliveryDate: delivery || null,
            operationalNotes: notes,
          },
          "PATCH",
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
    <div className="commerce-page">
      <Link href="/vendas">← Vendas</Link>
      <h1>{sale.number}</h1>
      <p>
        Estado: <strong>{sale.status}</strong>
      </p>
      {sale.quoteId && (
        <Link href={`/orcamentos/${sale.quoteId}`}>
          Ver orçamento de origem
        </Link>
      )}
      {error && <Notice>{error}</Notice>}
      <div className="form-actions">
        {sale.status === "RASCUNHO" && (
          <button className="button secondary" onClick={() => setEditing(true)}>
            Editar rascunho
          </button>
        )}
        {next[sale.status] && (
          <button
            className="button primary"
            disabled={busy}
            onClick={() => change(next[sale.status]!)}
          >
            {labels[next[sale.status]!]}
          </button>
        )}
      </div>
      {editing && (
        <SaleForm
          sale={sale}
          customers={customers}
          products={products}
          onCancel={() => setEditing(false)}
          onSaved={saved}
        />
      )}
      <section className="card">
        <h2>Resumo de recebimento</h2>
        <div className="form-grid">
          {Object.entries({
            Total: sale.receiptSummary.total,
            Recebido: sale.receiptSummary.received,
            Pendente: sale.receiptSummary.pending,
            Vencido: sale.receiptSummary.overdue,
          }).map(([label, value]) => (
            <p key={label}>
              {label}
              <br />
              <strong>R$ {value}</strong>
            </p>
          ))}
        </div>
      </section>
      {sale.status === "RASCUNHO" && (
        <InstallmentEditor
          total={sale.totals.total}
          onConfirm={async (installments, operationKey) =>
            saved(
              await api<SaleDTO>(`/api/sales/${sale.id}/confirm`, {
                expectedVersion: sale.version,
                installments,
                operationKey,
              }),
            )
          }
        />
      )}
      <DocumentPrint
        number={sale.number}
        snapshot={
          sale.snapshot ?? {
            company: {
              name: "Rascunho de venda",
              shortName: "",
              slogan: "",
              email: "",
              phone: "",
              address: "",
              footer: "Documento não confirmado",
              logoUrl: null,
            },
            customer: {
              name:
                customers.find((c) => c.id === sale.document.customerId)
                  ?.name ?? "Cliente",
              type: "PERSON",
              document: "",
              email: "",
              phone: "",
              address: "",
            },
            items: sale.document.items.map((i) => ({
              ...i,
              name: i.description,
            })),
            issuedAt: sale.createdAt,
          }
        }
        totals={sale.totals}
        paymentTerms={sale.document.paymentTerms}
      />
      {sale.installments.length > 0 && (
        <section className="card">
          <h2>Parcelas a receber</h2>
          <ul>
            {sale.installments.map((i) => (
              <li key={i.number}>
                Parcela {i.number} · R$ {i.amount} ·{" "}
                {i.dueDate.split("-").reverse().join("/")}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="commerce-form">
        <h2>Acompanhamento da produção</h2>
        <Field
          label="Entrega prevista"
          type="date"
          value={delivery}
          onChange={(e) => setDelivery(e.target.value)}
        />
        <label>
          Observações operacionais
          <textarea
            value={notes}
            maxLength={2000}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <button
          className="button secondary"
          disabled={busy}
          onClick={operations}
        >
          Salvar acompanhamento
        </button>
      </section>
      {!["ENTREGUE", "CANCELADA"].includes(sale.status) && (
        <section className="commerce-form">
          <h2>Cancelar venda</h2>
          <p>É necessário estornar recebimentos vigentes antes de cancelar.</p>
          <Field
            label="Motivo do cancelamento"
            value={reason}
            maxLength={2000}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            className="button secondary"
            disabled={busy || reason.trim().length < 3}
            onClick={() => change("CANCELADA")}
          >
            Cancelar venda
          </button>
        </section>
      )}
      <section className="card">
        <h2>Histórico</h2>
        <ul>
          {sale.events.map((e) => (
            <li key={e.id}>
              {new Date(e.createdAt).toLocaleString("pt-BR")} · {e.action} ·{" "}
              {e.actorName}
              {e.reason && ` · ${e.reason}`}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
