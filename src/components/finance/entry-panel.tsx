"use client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AccountDTO,
  CategoryDTO,
  EntryDTO,
  SettlementDTO,
  FinancialEventDTO,
} from "@/domain/finance/types";
import type { Page } from "@/domain/shared/pagination";
import { api } from "@/lib/client-api";
import { Notice } from "@/components/ui/field";
import {
  ActionForm,
  Pagination,
  ReversalForm,
  money,
  dateLabel,
} from "./shared";
import { EntryForm } from "./entry-form";
import { SettlementForm } from "./settlement-form";
import { FinanceEmpty } from "./reading";
type Detail = EntryDTO & {
  settlements: SettlementDTO[];
  events: FinancialEventDTO[];
};
export function EntryPanel({
  result,
  accounts,
  categories,
  query,
  initialDetail,
}: {
  result: Page<EntryDTO>;
  accounts: AccountDTO[];
  categories: CategoryDTO[];
  query: Record<string, string>;
  initialDetail?: Detail | null;
}) {
  const router = useRouter(),
    [detail, setDetail] = useState<Detail | null>(initialDetail ?? null),
    [mode, setMode] = useState<"list" | "new" | "edit" | "settle" | "cancel">(
      "list",
    ),
    [reversal, setReversal] = useState<string | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const focusDetail = useRef(false);
  useEffect(() => {
    if (!loading && focusDetail.current && detail) {
      detailHeading.current?.focus();
      focusDetail.current = false;
    }
  }, [detail, loading]);
  async function load(id: string) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      setError("");
      setDetail(
        await api<Detail>(`/api/finance/entries/${encodeURIComponent(id)}`),
      );
      focusDetail.current = true;
      setMode("list");
      setReversal(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }
  function done() {
    setMode("list");
    setReversal(null);
    if (detail) void load(detail.id);
    router.refresh();
  }
  return (
    <section className="finance-reading">
      <div className="page-heading">
        <div>
          <h1>Contas a pagar e receber</h1>
          <p>
            Títulos a pagar ou receber, com vencimento e valor em aberto. O
            título é uma obrigação; a baixa registra o pagamento ou recebimento
            na conta.
          </p>
        </div>
        <Button
          variant="default"
          size="sm"
          className=""
          disabled={loading}
          onClick={() => {
            setDetail(null);
            setMode("new");
          }}
        >
          Novo lançamento
        </Button>
      </div>
      {loading && (
        <Notice kind="info">
          Carregando título… Aguarde para consultar ou alterar o detalhe.
        </Notice>
      )}
      {error && <Notice>{error}</Notice>}
      {(mode === "new" || mode === "edit") && (
        <EntryForm
          key={mode === "edit" ? detail?.id : "new"}
          entry={mode === "edit" && detail ? detail : undefined}
          categories={categories}
          onDone={done}
          onCancel={() => setMode("list")}
        />
      )}
      {detail && !loading && (
        <Card asChild>
          <section className="commerce-form">
            <div className="page-heading">
              <div>
                <h2 ref={detailHeading} tabIndex={-1}>
                  {detail.description}
                </h2>
                <p>
                  {detail.counterparty} · {dateLabel(detail.dueDate)} ·{" "}
                  {detail.state}
                  {detail.overdue ? " · Vencido" : ""}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className=""
                onClick={() => {
                  setDetail(null);
                  setMode("list");
                  setReversal(null);
                  detailTrigger.current?.focus();
                }}
              >
                Fechar detalhe
              </Button>
            </div>
            <p>
              Valor: {money(detail.amount)} · Baixado:{" "}
              {money(detail.paidAmount)} · Restante:{" "}
              <strong>{money(detail.remainingAmount)}</strong>
            </p>
            {detail.receiptId && (
              <p>
                Origem:{" "}
                <Link
                  href={`/estoque?view=receipts&receiptId=${detail.receiptId}#receipt-${detail.receiptId}`}
                >
                  Recebimento de compra
                </Link>
              </p>
            )}
            {detail.saleId && (
              <p>
                Origem:{" "}
                <Link href={`/vendas/${detail.saleId}`}>
                  {detail.saleNumber}
                </Link>{" "}
                {detail.installmentNumber !== null && (
                  <> · Parcela {detail.installmentNumber}</>
                )}
              </p>
            )}
            <div className="finance-actions">
              {!detail.canceledAt && detail.remainingAmount !== "0.00" && (
                <Button
                  variant="default"
                  size="sm"
                  className=""
                  onClick={() => {
                    setMode("settle");
                    setReversal(null);
                  }}
                >
                  Registrar baixa
                </Button>
              )}
              {!detail.saleId &&
                !detail.receiptId &&
                !detail.consignmentPartnerId &&
                !detail.canceledAt && (
                  <Button
                    variant="outline"
                    size="sm"
                    className=""
                    onClick={() => {
                      setMode("edit");
                      setReversal(null);
                    }}
                  >
                    Editar lançamento
                  </Button>
                )}
              {!detail.receiptId &&
                !detail.consignmentPartnerId &&
                !detail.canceledAt &&
                detail.paidAmount === "0.00" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className=""
                    onClick={() => {
                      setMode("cancel");
                      setReversal(null);
                    }}
                  >
                    {detail.saleId
                      ? "Cancelar venda de origem"
                      : "Cancelar lançamento"}
                  </Button>
                )}
            </div>
            <h3>Baixas registradas</h3>
            {!detail.settlements.length && <p>Nenhuma baixa registrada.</p>}
            {detail.settlements.map((s) => (
              <div className="finance-history" key={s.id}>
                <span>
                  {dateLabel(s.effectiveDate)} · {money(s.amount)} · {s.method}{" "}
                  ·{" "}
                  {accounts.find((a) => a.id === s.accountId)?.name ?? "Conta"}{" "}
                  · {s.reversed ? "Estornada" : "Vigente"}
                </span>
                {!s.reversed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className=""
                    onClick={() => {
                      setReversal(s.id);
                      setMode("list");
                    }}
                  >
                    Estornar baixa
                  </Button>
                )}
              </div>
            ))}
            <details>
              <summary>Histórico de alterações</summary>
              {detail.events.map((e) => (
                <p key={e.id}>
                  {new Date(e.createdAt).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}{" "}
                  · {e.actorName} · {e.action} {e.reason}
                </p>
              ))}
            </details>
          </section>
        </Card>
      )}
      {mode === "settle" && detail && (
        <SettlementForm
          key={`${detail.id}-${detail.version}`}
          entry={detail}
          accounts={accounts}
          onDone={done}
          onCancel={() => setMode("list")}
        />
      )}
      {reversal && (
        <ReversalForm
          url={`/api/finance/settlements/${reversal}/reverse`}
          onDone={done}
          onCancel={() => setReversal(null)}
        />
      )}
      {mode === "cancel" && detail && (
        <ActionForm
          title={
            detail.saleId
              ? "Cancelar a venda e todas as parcelas"
              : "Cancelar lançamento"
          }
          submit="Confirmar cancelamento"
          onDone={done}
          onCancel={() => setMode("list")}
          onSubmit={(data) =>
            api(`/api/finance/entries/${detail.id}/cancel`, {
              reason: data.get("reason"),
              expectedVersion: detail.version,
            })
          }
        >
          {detail.saleId && (
            <Notice kind="info">
              Esta ação cancela a venda de origem inteira, incluindo todas as
              parcelas. Antes, todas as baixas da venda precisam estar
              estornadas. Vendas entregues não podem ser canceladas.
            </Notice>
          )}
          <Label className="field">
            Justificativa
            <Input name="reason" minLength={3} maxLength={2000} required />
          </Label>
        </ActionForm>
      )}
      <Card asChild>
        <div className="table-scroll">
          <Table aria-label="Títulos a pagar e receber">
            <TableHeader>
              <TableRow>
                <TableHead>Lançamento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="finance-amount text-right">
                  Valor do título
                </TableHead>
                <TableHead className="finance-amount text-right">
                  Em aberto
                </TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <strong className="finance-description">
                      {e.description}
                    </strong>
                    <small>{e.counterparty}</small>
                  </TableCell>
                  <TableCell>
                    {e.kind === "RECEIVABLE" ? "A receber" : "A pagar"}
                  </TableCell>
                  <TableCell>{dateLabel(e.dueDate)}</TableCell>
                  <TableCell className="finance-amount">
                    {money(e.amount)}
                  </TableCell>
                  <TableCell className="finance-amount">
                    {money(e.remainingAmount)}
                  </TableCell>
                  <TableCell>
                    {e.state}
                    {e.overdue && <small>Vencido</small>}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className=""
                      disabled={loading}
                      aria-label={`Ver detalhes de ${e.description}`}
                      onClick={(event) => {
                        detailTrigger.current = event.currentTarget;
                        void load(e.id);
                      }}
                    >
                      Ver detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!result.items.length && (
            <FinanceEmpty
              noun="títulos"
              total={result.total}
              base="/financeiro/lancamentos"
              query={query}
            />
          )}
        </div>
      </Card>
      <Pagination
        result={result}
        base="/financeiro/lancamentos"
        query={query}
      />
    </section>
  );
}
