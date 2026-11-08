"use client";
import { useEffect, useRef, useState } from "react";
import { OperationWorkspace } from "@/components/admin/operation-workspace";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef("");
  const loading = useRef(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const router = useRouter(),
    [detail, setDetail] = useState(initialDetail),
    [mode, setMode] = useState("list"),
    [receipt, setReceipt] = useState<StockReceiptDTO | null>(null),
    [reservation, setReservation] = useState<StockReservationDTO | null>(null),
    [source, setSource] = useState<{ id: string; kind: string } | undefined>(),
    [returnId, setReturnId] = useState(""),
    [error, setError] = useState("");
  const detailId = detail?.id;
  useEffect(() => {
    if (detailId && ["detail", "list"].includes(mode)) heading.current?.focus();
  }, [detailId, mode]);
  async function load(id: string) {
    if (loading.current) return;
    loading.current = true;
    setBusy(true);
    try {
      setDetail(await api<StockItemDTO>(`/api/stock/items/${id}`));
      setMode("detail");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      loading.current = false;
      setBusy(false);
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
        if (!r.items[0])
          throw new Error(
            "Recebimento não encontrado. Os campos foram mantidos; confira o registro antes de reenviar.",
          );
        setReceipt(r.items[0]);
      }
      if (reservation) {
        const r = await api<{ items: StockReservationDTO[] }>(
          `/api/stock/reservations?reservationId=${reservation.id}`,
        );
        if (!r.items[0])
          throw new Error(
            "Reserva não encontrada. Os campos foram mantidos; confira o registro antes de reenviar.",
          );
        setReservation(r.items[0]);
      }
      setError("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function done() {
    setError("");
    setFeedback("Operação concluída. Confira os saldos atualizados.");
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
    <OperationWorkspace>
      {feedback && <Notice kind="success">{feedback}</Notice>}
      {error && <Notice>{error}</Notice>}
      {busy && <p role="status">Carregando material…</p>}
      {!["list", "detail", "receive"].includes(mode) && (
        <div className="rounded border p-3">
          <p>
            Se outra pessoa alterou este registro, atualize os saldos e revise
            antes de reenviar. Os campos preenchidos serão mantidos.
          </p>
          <Button
            data-preserve-draft
            variant="outline"
            onClick={() => void refreshDraft()}
          >
            Atualizar dados sem apagar rascunho
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {admin && (
          <Button
            disabled={busy}
            onClick={() => {
              setDetail(null);
              setMode("item");
            }}
          >
            Habilitar item
          </Button>
        )}
        <Button
          disabled={busy}
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
        <Card className="operation-entry flex flex-col gap-4">
          <div className="flex flex-wrap justify-between gap-2">
            <h2 ref={heading} tabIndex={-1}>
              {detail.name}
            </h2>
            <Button
              variant="ghost"
              onClick={() => {
                setDetail(null);
                setMode("list");
                requestAnimationFrame(() =>
                  document.getElementById(opener.current)?.focus(),
                );
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
      {mode === "list" &&
        !detail &&
        (view === "receipts" ? (
          receipts.map((r) => (
            <Card
              key={r.id}
              id={`receipt-${r.id}`}
              className="operation-entry flex flex-col gap-3"
            >
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
              {r.status === "PENDING" && (
                <p className="text-muted-foreground">
                  Entrada física registrada.{" "}
                  {admin
                    ? "Confira os valores e o vínculo das contas a seguir."
                    : "Um administrador pode conferir os valores e o vínculo das contas."}
                </p>
              )}
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
            <Card key={r.id} className="operation-entry flex flex-col gap-3">
              <Link className="underline" href={`/vendas/${r.saleId}`}>
                {r.saleNumber}
              </Link>
              <h2>{r.name}</h2>
              <Badge variant="outline">
                {Number(r.remaining) > 0
                  ? "Reserva com saldo"
                  : "Sem saldo reservado"}
              </Badge>
              <dl className="operation-balances">
                <div>
                  <dt>Reservado restante</dt>
                  <dd>
                    {r.remaining} {units[r.unit]}
                  </dd>
                </div>
                <div>
                  <dt>Consumido</dt>
                  <dd>
                    {r.consumed} {units[r.unit]}
                  </dd>
                </div>
                <div>
                  <dt>Liberado</dt>
                  <dd>
                    {r.released} {units[r.unit]}
                  </dd>
                </div>
              </dl>
              {Number(r.remaining) > 0 && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    if (loading.current) return;
                    loading.current = true;
                    setBusy(true);
                    try {
                      setDetail(
                        await api<StockItemDTO>(`/api/stock/items/${r.itemId}`),
                      );
                      setReservation(r);
                      setMode("reservation");
                      setError("");
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      loading.current = false;
                      setBusy(false);
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
              <Card key={i.id} className="operation-entry flex flex-col gap-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <h2 className="min-w-0 break-words">
                    {i.name}
                    {!i.active && " · Inativo"}
                  </h2>
                  <Button
                    id={`open-stock-${i.id}`}
                    disabled={busy}
                    variant="outline"
                    onClick={() => {
                      opener.current = `open-stock-${i.id}`;
                      void load(i.id);
                    }}
                    aria-label={`Ver detalhe de ${i.name}`}
                  >
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
        ))}
    </OperationWorkspace>
  );
}
