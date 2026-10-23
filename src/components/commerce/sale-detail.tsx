"use client";
import { SaleStock } from "@/components/stock/reservation-form";
import { DocumentArt } from "@/components/art/document-art";
import {
  DocumentCostSummary,
  currentBindingState,
} from "@/components/pricing/line-cost-summary";
import { Card } from "@/components/ui/card";
import { KitDocumentHistory } from "./kit-document-history";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
  const stale =
    sale.costs?.bindings.some((b) => {
      const item = sale.document.items.find((i) => i.lineId === b.lineId);
      return !item || currentBindingState(item, b) === "STALE";
    }) ?? false;
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
      <DocumentArt items={sale.document.items} art={sale.art} />
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
          <Button
            variant="outline"
            size="sm"
            className=""
            onClick={() => setEditing(true)}
          >
            Editar rascunho
          </Button>
        )}
        {sale.status !== "RASCUNHO" && sale.status !== "CANCELADA" && (
          <Button asChild variant="outline">
            <Link href={`/producao?saleId=${sale.id}`}>
              Produção e entregas
            </Link>
          </Button>
        )}
        {sale.fulfillmentMode !== "U3" && next[sale.status] && (
          <Button
            variant="default"
            size="sm"
            className=""
            disabled={busy}
            onClick={() => change(next[sale.status]!)}
          >
            {labels[next[sale.status]!]}
          </Button>
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
      <Card asChild>
        <section className="">
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
      </Card>
      {sale.status === "RASCUNHO" && !stale && (
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
      <SaleStock sale={sale} />
      <DocumentCostSummary
        items={sale.document.items}
        costs={sale.costs}
        discount={sale.document.discount}
        shipping={sale.document.shipping}
      />
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
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              name: i.description,
            })),
            issuedAt: sale.createdAt,
          }
        }
        totals={sale.totals}
        paymentTerms={sale.document.paymentTerms}
      />
      {sale.installments.length > 0 && (
        <Card asChild>
          <section className="">
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
        </Card>
      )}
      <section className="commerce-form">
        <h2>Acompanhamento da produção</h2>
        <Field
          label="Entrega prevista"
          type="date"
          value={delivery}
          onChange={(e) => setDelivery(e.target.value)}
        />
        <Label>
          Observações operacionais
          <Textarea
            value={notes}
            maxLength={2000}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Label>
        <Button
          variant="outline"
          size="sm"
          className=""
          disabled={busy}
          onClick={operations}
        >
          Salvar acompanhamento
        </Button>
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
          <Button
            variant="outline"
            size="sm"
            className=""
            disabled={busy || reason.trim().length < 3}
            onClick={() => change("CANCELADA")}
          >
            Cancelar venda
          </Button>
        </section>
      )}
      <Card asChild>
        <section className="">
          {sale.document.catalogKits && (
            <KitDocumentHistory value={sale.document.catalogKits} />
          )}
          <h2>Histórico</h2>
          <ul>
            {sale.events.map((e) => (
              <li key={e.id}>
                {new Date(e.createdAt).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}{" "}
                ·{" "}
                {e.action === "KIT_DISCOUNT_REVIEW"
                  ? "Desconto revisado"
                  : e.action}{" "}
                · {e.actorName}
                {e.reason && ` · ${e.reason}`}
              </li>
            ))}
          </ul>
        </section>
      </Card>
    </div>
  );
}
