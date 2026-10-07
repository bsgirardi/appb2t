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
import { useState } from "react";
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
type Detail = EntryDTO & {
  settlements: SettlementDTO[];
  events: FinancialEventDTO[];
};
export function EntryPanel({
  result,
  accounts,
  categories,
  query,
}: {
  result: Page<EntryDTO>;
  accounts: AccountDTO[];
  categories: CategoryDTO[];
  query: Record<string, string>;
}) {
  const router = useRouter(),
    [detail, setDetail] = useState<Detail | null>(null),
    [mode, setMode] = useState<"list" | "new" | "edit" | "settle" | "cancel">(
      "list",
    ),
    [reversal, setReversal] = useState<string | null>(null),
    [error, setError] = useState("");
  async function load(id: string) {
    try {
      setError("");
      setDetail(await api<Detail>(`/api/finance/entries/${id}`));
      setMode("list");
      setReversal(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function done() {
    setMode("list");
    setReversal(null);
    if (detail) void load(detail.id);
    router.refresh();
  }
  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Contas a pagar e receber</h1>
          <p>Obrigações previstas, parcelas de vendas e histórico de baixas.</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className=""
          onClick={() => {
            setDetail(null);
            setMode("new");
          }}
        >
          Novo lançamento
        </Button>
      </div>
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
      {detail && (
        <Card asChild>
          <section className="commerce-form">
            <div className="page-heading">
              <div>
                <h2>{detail.description}</h2>
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
                · Parcela {detail.installmentNumber}
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
              {!detail.saleId && !detail.receiptId && !detail.canceledAt && (
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lançamento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Restante</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <strong>{e.description}</strong>
                    <small>{e.counterparty}</small>
                  </TableCell>
                  <TableCell>
                    {e.kind === "RECEIVABLE" ? "A receber" : "A pagar"}
                  </TableCell>
                  <TableCell>{dateLabel(e.dueDate)}</TableCell>
                  <TableCell>{money(e.amount)}</TableCell>
                  <TableCell>{money(e.remainingAmount)}</TableCell>
                  <TableCell>
                    {e.state}
                    {e.overdue && <small>Vencido</small>}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className=""
                      onClick={() => void load(e.id)}
                    >
                      Ver detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!result.items.length && (
            <p className="commerce-form">Nenhum lançamento encontrado.</p>
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
