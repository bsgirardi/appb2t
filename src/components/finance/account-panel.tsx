"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountDTO } from "@/domain/finance/types";
import { api } from "@/lib/client-api";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { ActionForm, Select, money, dateLabel } from "./shared";
import { TransferForm } from "./transfer-form";
export function AccountPanel({ accounts }: { accounts: AccountDTO[] }) {
  const router = useRouter(),
    [editing, setEditing] = useState<AccountDTO | "new" | null>(null),
    [adjusting, setAdjusting] = useState<AccountDTO | null>(null),
    [transfer, setTransfer] = useState(false);
  const current = editing && editing !== "new" ? editing : undefined;
  function done() {
    setEditing(null);
    setAdjusting(null);
    setTransfer(false);
    router.refresh();
  }
  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Contas e categorias</h1>
          <p>Saldos internos, contas de caixa e bancos.</p>
        </div>
        <div className="finance-actions">
          <button
            className="button secondary"
            onClick={() => {
              setTransfer(true);
              setEditing(null);
              setAdjusting(null);
            }}
          >
            Transferir entre contas
          </button>
          <button
            className="button primary"
            onClick={() => {
              setEditing("new");
              setTransfer(false);
              setAdjusting(null);
            }}
          >
            Nova conta
          </button>
        </div>
      </div>
      {transfer && (
        <TransferForm
          accounts={accounts}
          onDone={done}
          onCancel={() => setTransfer(false)}
        />
      )}
      {editing && (
        <ActionForm
          key={current?.id ?? "new"}
          title={current ? "Editar conta" : "Nova conta"}
          onDone={done}
          onCancel={() => setEditing(null)}
          onSubmit={(data) =>
            api(
              `/api/finance/accounts${current ? `/${current.id}` : ""}`,
              {
                ...Object.fromEntries(data),
                active: data.get("active") === "true",
                ...(current ? { expectedVersion: current.version } : {}),
              },
              current ? "PUT" : "POST",
            )
          }
        >
          <div className="form-grid">
            <label className="field">
              Nome
              <input
                name="name"
                minLength={2}
                maxLength={100}
                defaultValue={current?.name}
                required
              />
            </label>
            <Select
              name="type"
              label="Tipo"
              value={current?.type ?? "BANK"}
              options={[
                { value: "BANK", label: "Banco" },
                { value: "CASH", label: "Caixa" },
                { value: "OTHER", label: "Outra" },
              ]}
            />
            <label className="field">
              Saldo inicial (R$)
              <input
                name="openingBalance"
                defaultValue={current?.openingBalance ?? "0.00"}
                inputMode="decimal"
                required
              />
            </label>
            <label className="field">
              Data do saldo inicial
              <input
                name="openingDate"
                type="date"
                max={todaySaoPaulo(new Date())}
                defaultValue={current?.openingDate ?? todaySaoPaulo(new Date())}
                required
              />
            </label>
            <Select
              name="active"
              label="Situação"
              value={String(current?.active ?? true)}
              options={[
                { value: "true", label: "Ativa" },
                { value: "false", label: "Inativa" },
              ]}
            />
          </div>
          <p>
            Após movimentações, use um ajuste para corrigir o saldo. A
            inativação exige saldo zero.
          </p>
        </ActionForm>
      )}
      {adjusting && (
        <ActionForm
          title={`Ajustar ${adjusting.name}`}
          onDone={done}
          onCancel={() => setAdjusting(null)}
          onSubmit={(data, operationKey) =>
            api(`/api/finance/accounts/${adjusting.id}/adjustments`, {
              ...Object.fromEntries(data),
              expectedVersion: adjusting.version,
              operationKey,
            })
          }
        >
          <p>
            Informe um valor positivo para acrescentar ou negativo para reduzir
            o saldo. A correção ficará no histórico.
          </p>
          <div className="form-grid">
            <label className="field">
              Valor do ajuste (R$)
              <input name="amount" inputMode="decimal" required />
            </label>
            <label className="field">
              Data efetiva
              <input
                name="effectiveDate"
                type="date"
                defaultValue={todaySaoPaulo(new Date())}
                min={adjusting.openingDate}
                max={todaySaoPaulo(new Date())}
                required
              />
            </label>
            <label className="field">
              Justificativa
              <input name="reason" minLength={3} maxLength={2000} required />
            </label>
          </div>
        </ActionForm>
      )}
      <div className="finance-grid">
        {accounts.map((a) => (
          <article className="card finance-account" key={a.id}>
            <small>
              {a.active ? "Ativa" : "Inativa"} ·{" "}
              {a.type === "BANK"
                ? "Banco"
                : a.type === "CASH"
                  ? "Caixa"
                  : "Outra"}
            </small>
            <h2>{a.name}</h2>
            <strong className="finance-value">{money(a.balance)}</strong>
            {a.negative && <p className="notice error">Saldo negativo</p>}
            <p>
              Saldo inicial: {money(a.openingBalance)} em{" "}
              {dateLabel(a.openingDate)}
            </p>
            <div className="finance-actions">
              <button
                className="button secondary"
                onClick={() => {
                  setEditing(a);
                  setAdjusting(null);
                  setTransfer(false);
                }}
              >
                Editar
              </button>
              {a.active && (
                <button
                  className="button secondary"
                  onClick={() => {
                    setAdjusting(a);
                    setEditing(null);
                    setTransfer(false);
                  }}
                >
                  Ajustar saldo
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!accounts.length && (
        <p className="card commerce-form">
          Cadastre a primeira conta para registrar pagamentos e recebimentos.
        </p>
      )}
    </section>
  );
}
