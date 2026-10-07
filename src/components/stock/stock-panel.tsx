"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Notice } from "@/components/ui/field";
import { ActionForm, money } from "@/components/finance/shared";
import { api } from "@/lib/client-api";
import { stockCommand } from "@/lib/stock-client";
import type {
  StockItemDTO,
  StockReceiptDTO,
  StockReservationDTO,
  StockOptions,
} from "@/server/stock/queries";
import type { CategoryDTO } from "@/domain/finance/types";
import { StockSummary, text, units } from "./shared";
import { ItemForm, OpeningForm } from "./item-form";
import { MovementForm, IdentityForm } from "./movement-form";
import { ReceiptForm } from "./receipt-form";
import { ReceiptFinance, ReturnFinance } from "./receipt-finance";
import { ReservationAction } from "./reservation-form";
import { Ledger } from "./ledger";
import { StockDecimal as D } from "@/domain/stock/quantities";
export function StockPanel({
  admin,
  items,
  receipts,
  reservations,
  options,
  categories,
  view,
  initialDetail,
}: {
  admin: boolean;
  items: StockItemDTO[];
  receipts: StockReceiptDTO[];
  reservations: StockReservationDTO[];
  options: StockOptions;
  categories: CategoryDTO[];
  view: string;
  initialDetail: StockItemDTO | null;
}) {
  const router = useRouter(),
    [detail, setDetail] = useState(initialDetail),
    [mode, setMode] = useState("list"),
    [receipt, setReceipt] = useState<StockReceiptDTO | null>(null),
    [reservation, setReservation] = useState<StockReservationDTO | null>(null),
    [source, setSource] = useState<{ id: string; kind: string } | undefined>(),
    [returnId, setReturnId] = useState(""),
    [error, setError] = useState("");
  async function load(id: string) {
    try {
      setDetail(await api<StockItemDTO>(`/api/stock/items/${id}`));
      setMode("detail");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function refreshDraft() {
    try {
      if (detail)
        setDetail(await api<StockItemDTO>(`/api/stock/items/${detail.id}`));
      if (receipt) {
        const r = await api<{ items: StockReceiptDTO[] }>(
          `/api/stock/receipts?receiptId=${receipt.id}`,
        );
        setReceipt(r.items[0] ?? null);
      }
      if (reservation) {
        const r = await api<{ items: StockReservationDTO[] }>(
          `/api/stock/reservations?reservationId=${reservation.id}`,
        );
        setReservation(r.items[0] ?? null);
      }
      setError("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function done() {
    setMode(detail ? "detail" : "list");
    setReceipt(null);
    setSource(undefined);
    setReservation(null);
    if (detail) void load(detail.id);
    router.refresh();
  }
  const cancel = () => {
    setMode(detail ? "detail" : "list");
    setReceipt(null);
    setReservation(null);
    setSource(undefined);
  };
  const reference = detail?.materialId
    ? options.materials.find((m) => m.id === detail.materialId)
    : detail?.extraId
      ? options.extras.find((e) => e.id === detail.extraId)
      : undefined;
  return (
    <div className="space-y-5">
      {error && <Notice>{error}</Notice>}
      {!["list", "detail", "receive"].includes(mode) && (
        <div className="rounded border p-3">
          <p>
            Se outra pessoa alterou este registro, atualize os saldos e revise
            antes de reenviar. Os campos preenchidos serão mantidos.
          </p>
          <Button variant="outline" onClick={() => void refreshDraft()}>
            Atualizar dados sem apagar rascunho
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {admin && (
          <Button
            onClick={() => {
              setDetail(null);
              setMode("item");
            }}
          >
            Habilitar item
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => {
            setDetail(null);
            setMode("receive");
          }}
        >
          Receber compra
        </Button>
      </div>
      {mode === "item" && admin && (
        <ItemForm
          item={detail ?? undefined}
          options={options}
          onDone={done}
          onCancel={cancel}
        />
      )}
      {mode === "receive" && (
        <ReceiptForm items={items} onDone={done} onCancel={cancel} />
      )}
      {mode === "opening" && detail && admin && (
        <OpeningForm item={detail} onDone={done} onCancel={cancel} />
      )}
      {mode === "movement" && detail && (
        <MovementForm
          item={detail}
          admin={admin}
          source={source}
          onDone={done}
          onCancel={cancel}
        />
      )}
      {mode === "identity" && detail && (
        <IdentityForm item={detail} onDone={done} onCancel={cancel} />
      )}
      {mode === "confirm" && receipt && admin && (
        <ReceiptFinance
          receipt={receipt}
          categories={categories}
          onDone={done}
          onCancel={cancel}
        />
      )}
      {mode === "return-finance" && receipt && admin && (
        <ReturnFinance
          receipt={receipt}
          movementId={returnId}
          onDone={done}
          onCancel={cancel}
        />
      )}
      {mode === "reservation" && reservation && detail && (
        <ReservationAction
          reservation={reservation}
          item={detail}
          onDone={done}
          onCancel={cancel}
        />
      )}
      {mode === "cancel-receipt" && receipt && admin && (
        <ActionForm
          title={`Cancelar recebimento · ${receipt.supplier}`}
          onDone={done}
          onCancel={cancel}
          onSubmit={(f, operationKey) =>
            stockCommand("CANCEL_RECEIPT", {
              receiptId: receipt.id,
              expectedVersion: receipt.version,
              operationKey,
              reason: text(f, "reason"),
            })
          }
        >
          <p>
            Compensa a entrada física e cancela as obrigações vinculadas.
            Operação bloqueada se houver consumo posterior, reservas dependentes
            ou baixa vigente.
          </p>
          <Field
            label="Motivo do cancelamento"
            name="reason"
            minLength={3}
            maxLength={2000}
            required
          />
        </ActionForm>
      )}
      {mode === "apply" && detail && reference && admin && (
        <ActionForm
          title="Aplicar custo à calculadora"
          onDone={done}
          onCancel={cancel}
          onSubmit={(f, operationKey) =>
            stockCommand("APPLY_REFERENCE", {
              itemId: detail.id,
              expectedVersion: detail.version,
              catalogVersion: reference.version,
              operationKey,
              reason: text(f, "reason"),
            })
          }
        >
          <p>
            Referência anterior:{" "}
            {money(
              "price" in reference
                ? (reference.price ?? null)
                : (reference.unitCost ?? null),
            )}
            . Nova referência:{" "}
            {money(
              new D(detail.valuation?.unitCost ?? 0)
                .times(detail.materialId ? 1000 : 1)
                .toFixed(),
            )}
            {detail.materialId ? " por kg/litro" : " por unidade base"}.
          </p>
          <p>Produtos e documentos já gravados preservam seus valores.</p>
          <Field
            label="Justificativa"
            name="reason"
            required
            minLength={3}
            maxLength={2000}
          />
        </ActionForm>
      )}
      {detail && (mode === "detail" || mode === "list") && (
        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap justify-between gap-2">
            <h2>{detail.name}</h2>
            <Button
              variant="ghost"
              onClick={() => {
                setDetail(null);
                setMode("list");
              }}
            >
              Fechar detalhe
            </Button>
          </div>
          <StockSummary item={detail} />
          <div className="flex flex-wrap gap-2">
            {admin && (
              <Button variant="outline" onClick={() => setMode("item")}>
                Configurar
              </Button>
            )}
            {!detail.inventoriedAt && admin && (
              <Button onClick={() => setMode("opening")}>
                Registrar contagem inicial
              </Button>
            )}
            {detail.inventoriedAt && (
              <Button onClick={() => setMode("movement")}>Movimentar</Button>
            )}
            <Button variant="outline" onClick={() => setMode("identity")}>
              Identificar rolo/lote
            </Button>
          </div>
          {admin && (
            <div className="rounded border p-3">
              <p>
                Método:{" "}
                {detail.method === "MANUAL"
                  ? "Referência manual"
                  : "Média ponderada"}
              </p>
              <p>
                Custo unitário: {money(detail.valuation?.unitCost ?? null)} /{" "}
                {units[detail.unit]}
              </p>
              <p>
                {detail.valuation?.provisional
                  ? "Valorização provisória — há custos ou déficits pendentes."
                  : "Valorização conferida"}
              </p>
              {reference &&
                detail.valuation?.unitCost !== null &&
                !detail.valuation?.provisional &&
                detail.inventoriedAt && (
                  <Button variant="outline" onClick={() => setMode("apply")}>
                    Aplicar referência à calculadora
                  </Button>
                )}
            </div>
          )}
          <h3>Identificações</h3>
          {detail.identities.map((i) => (
            <p
              key={i.id ?? "none"}
              className={Number(i.quantity) < 0 ? "text-destructive" : ""}
            >
              {i.label}: {i.quantity} {units[detail.unit]}
            </p>
          ))}
          <Ledger
            key={`${detail.id}-${detail.version}`}
            item={detail}
            admin={admin}
            onCorrect={(s) => {
              setSource(s);
              setMode("movement");
            }}
          />
        </Card>
      )}
      {view === "receipts" ? (
        receipts.map((r) => (
          <Card key={r.id} id={`receipt-${r.id}`} className="space-y-2 p-4">
            <h2>
              {r.supplier} {r.document && `· ${r.document}`}
            </h2>
            <p>
              {r.effectiveDate.split("-").reverse().join("/")} ·{" "}
              {r.status === "PENDING"
                ? "Aguardando conferência"
                : r.status === "CANCELED"
                  ? "Cancelado"
                  : "Conferido"}
            </p>
            {r.lines.map((l) => (
              <p key={l.id}>
                {l.name}: {l.quantity} {units[l.unit]}
              </p>
            ))}
            {admin && (
              <>
                <p>Total: {money(r.total ?? null)}</p>
                <div className="flex flex-wrap gap-2">
                  {r.status === "PENDING" && (
                    <Button
                      onClick={() => {
                        setReceipt(r);
                        setMode("confirm");
                      }}
                    >
                      Conferir e vincular contas
                    </Button>
                  )}
                  {r.status !== "CANCELED" && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setReceipt(r);
                        setMode("cancel-receipt");
                      }}
                    >
                      Cancelar recebimento
                    </Button>
                  )}
                  {(r.entryIds ?? []).length > 0 && (
                    <Link
                      className="underline"
                      href="/financeiro/lancamentos?kind=PAYABLE"
                    >
                      Contas a pagar
                    </Link>
                  )}
                </div>
                {r.pendingReturns?.map((m) => (
                  <Notice key={m.id} kind="info">
                    Devolução de {m.quantity}: financeiro pendente.{" "}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setReceipt(r);
                        setReturnId(m.id);
                        setMode("return-finance");
                      }}
                    >
                      Resolver devolução
                    </Button>
                  </Notice>
                ))}
              </>
            )}
          </Card>
        ))
      ) : view === "reservations" ? (
        reservations.map((r) => (
          <Card key={r.id} className="space-y-2 p-4">
            <Link className="underline" href={`/vendas/${r.saleId}`}>
              {r.saleNumber}
            </Link>
            <h2>{r.name}</h2>
            <p>
              Reservado restante: {r.remaining} {units[r.unit]} · consumido:{" "}
              {r.consumed} · liberado: {r.released}
            </p>
            {Number(r.remaining) > 0 && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    setDetail(
                      await api<StockItemDTO>(`/api/stock/items/${r.itemId}`),
                    );
                    setReservation(r);
                    setMode("reservation");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Consumir ou liberar
              </Button>
            )}
          </Card>
        ))
      ) : (
        <div className="grid gap-4">
          {items.map((i) => (
            <Card key={i.id} className="space-y-3 p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <h2>
                  {i.name}
                  {!i.active && " · Inativo"}
                </h2>
                <Button variant="outline" onClick={() => void load(i.id)}>
                  Ver detalhe
                </Button>
              </div>
              <StockSummary item={i} />
              {admin && i.valuation?.provisional && (
                <p className="text-muted-foreground">Custo provisório</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
