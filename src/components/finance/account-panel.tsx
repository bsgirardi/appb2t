"use client";
import { Notice } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
          <Button
            variant="outline"
            size="sm"
            className=""
            onClick={() => {
              setTransfer(true);
              setEditing(null);
              setAdjusting(null);
            }}
          >
            Transferir entre contas
          </Button>
          <Button
            variant="default"
            size="sm"
            className=""
            onClick={() => {
              setEditing("new");
              setTransfer(false);
              setAdjusting(null);
            }}
          >
            Nova conta
          </Button>
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
            <Label className="field">
              Nome
              <Input
                name="name"
                minLength={2}
                maxLength={100}
                defaultValue={current?.name}
                required
              />
            </Label>
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
            <Label className="field">
              Saldo inicial (R$)
              <Input
                name="openingBalance"
                defaultValue={current?.openingBalance ?? "0.00"}
                inputMode="decimal"
                required
              />
            </Label>
            <Label className="field">
              Data do saldo inicial
              <Input
                name="openingDate"
                type="date"
                max={todaySaoPaulo(new Date())}
                defaultValue={current?.openingDate ?? todaySaoPaulo(new Date())}
                required
              />
            </Label>
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
            <Label className="field">
              Valor do ajuste (R$)
              <Input name="amount" inputMode="decimal" required />
            </Label>
            <Label className="field">
              Data efetiva
              <Input
                name="effectiveDate"
                type="date"
                defaultValue={todaySaoPaulo(new Date())}
                min={adjusting.openingDate}
                max={todaySaoPaulo(new Date())}
                required
              />
            </Label>
            <Label className="field">
              Justificativa
              <Input name="reason" minLength={3} maxLength={2000} required />
            </Label>
          </div>
        </ActionForm>
      )}
      <div className="finance-grid">
        {accounts.map((a) => (
          <Card key={a.id} asChild>
            <article className="finance-account">
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
              {a.negative && <Notice>Saldo negativo</Notice>}
              <p>
                Saldo inicial: {money(a.openingBalance)} em{" "}
                {dateLabel(a.openingDate)}
              </p>
              <div className="finance-actions">
                <Button
                  variant="outline"
                  size="sm"
                  className=""
                  onClick={() => {
                    setEditing(a);
                    setAdjusting(null);
                    setTransfer(false);
                  }}
                >
                  Editar
                </Button>
                {a.active && (
                  <Button
                    variant="outline"
                    size="sm"
                    className=""
                    onClick={() => {
                      setAdjusting(a);
                      setEditing(null);
                      setTransfer(false);
                    }}
                  >
                    Ajustar saldo
                  </Button>
                )}
              </div>
            </article>
          </Card>
        ))}
      </div>
      {!accounts.length && (
        <Card asChild>
          <p className="commerce-form">
            Cadastre a primeira conta para registrar pagamentos e recebimentos.
          </p>
        </Card>
      )}
    </section>
  );
}
