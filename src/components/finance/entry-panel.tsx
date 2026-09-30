"use client";
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
        <button
          className="button primary"
          onClick={() => {
            setDetail(null);
            setMode("new");
          }}
        >
          Novo lançamento
        </button>
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
        <section className="card commerce-form">
          <div className="page-heading">
            <div>
              <h2>{detail.description}</h2>
              <p>
                {detail.counterparty} · {dateLabel(detail.dueDate)} ·{" "}
                {detail.state}
                {detail.overdue ? " · Vencido" : ""}
              </p>
            </div>
            <button
              className="button secondary"
              onClick={() => {
                setDetail(null);
                setMode("list");
                setReversal(null);
              }}
            >
              Fechar detalhe
            </button>
          </div>
          <p>
            Valor: {money(detail.amount)} · Baixado: {money(detail.paidAmount)}{" "}
            · Restante: <strong>{money(detail.remainingAmount)}</strong>
          </p>
          {detail.saleId && (
            <p>
              Origem:{" "}
              <Link href={`/vendas/${detail.saleId}`}>{detail.saleNumber}</Link>{" "}
              · Parcela {detail.installmentNumber}
            </p>
          )}
          <div className="finance-actions">
            {!detail.canceledAt && detail.remainingAmount !== "0.00" && (
              <button
                className="button primary"
                onClick={() => {
                  setMode("settle");
                  setReversal(null);
                }}
              >
                Registrar baixa
              </button>
            )}
            {!detail.saleId && !detail.canceledAt && (
              <button
                className="button secondary"
                onClick={() => {
                  setMode("edit");
                  setReversal(null);
                }}
              >
                Editar lançamento
              </button>
            )}
            {!detail.canceledAt && detail.paidAmount === "0.00" && (
              <button
                className="button secondary"
                onClick={() => {
                  setMode("cancel");
                  setReversal(null);
                }}
              >
                {detail.saleId
                  ? "Cancelar venda de origem"
                  : "Cancelar lançamento"}
              </button>
            )}
          </div>
          <h3>Baixas registradas</h3>
          {!detail.settlements.length && <p>Nenhuma baixa registrada.</p>}
          {detail.settlements.map((s) => (
            <div className="finance-history" key={s.id}>
              <span>
                {dateLabel(s.effectiveDate)} · {money(s.amount)} · {s.method} ·{" "}
                {accounts.find((a) => a.id === s.accountId)?.name ?? "Conta"} ·{" "}
                {s.reversed ? "Estornada" : "Vigente"}
              </span>
              {!s.reversed && (
                <button
                  className="button secondary"
                  onClick={() => {
                    setReversal(s.id);
                    setMode("list");
                  }}
                >
                  Estornar baixa
                </button>
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
          <label className="field">
            Justificativa
            <input name="reason" minLength={3} maxLength={2000} required />
          </label>
        </ActionForm>
      )}
      <div className="card table-scroll">
        <table>
          <thead>
            <tr>
              <th>Lançamento</th>
              <th>Tipo</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Restante</th>
              <th>Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((e) => (
              <tr key={e.id}>
                <td>
                  <strong>{e.description}</strong>
                  <small>{e.counterparty}</small>
                </td>
                <td>{e.kind === "RECEIVABLE" ? "A receber" : "A pagar"}</td>
                <td>{dateLabel(e.dueDate)}</td>
                <td>{money(e.amount)}</td>
                <td>{money(e.remainingAmount)}</td>
                <td>
                  {e.state}
                  {e.overdue && <small>Vencido</small>}
                </td>
                <td>
                  <button
                    className="button secondary"
                    onClick={() => void load(e.id)}
                  >
                    Ver detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!result.items.length && (
          <p className="commerce-form">Nenhum lançamento encontrado.</p>
        )}
      </div>
      <Pagination
        result={result}
        base="/financeiro/lancamentos"
        query={query}
      />
    </section>
  );
}
