"use client";
import { useState } from "react";
import type { CategoryDTO, EntryDTO } from "@/domain/finance/types";
import { splitInstallments } from "@/domain/commerce/installments";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { parseMoney } from "@/domain/commerce/validation";
import { api } from "@/lib/client-api";
import { ActionForm, Select } from "./shared";
export function EntryForm({
  entry,
  categories,
  onDone,
  onCancel,
}: {
  entry?: EntryDTO;
  categories: CategoryDTO[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState(entry?.kind ?? "PAYABLE");
  return (
    <ActionForm
      title={entry ? "Editar lançamento" : "Novo lançamento"}
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(data, operationKey) => {
        const input = {
          kind,
          description: data.get("description"),
          counterparty: data.get("counterparty"),
          categoryId: data.get("categoryId"),
          amount: parseMoney(String(data.get("amount"))),
          dueDate: String(data.get("dueDate")),
          ...(entry
            ? { expectedVersion: entry.version, customerId: entry.customerId }
            : {}),
        };
        return entry
          ? api(`/api/finance/entries/${entry.id}`, input, "PUT")
          : api("/api/finance/entries/groups", {
              entry: input,
              installments: splitInstallments(
                input.amount,
                Number(data.get("count")),
                input.dueDate,
              ),
              operationKey,
            });
      }}
    >
      <div className="form-grid">
        <label className="field">
          Tipo
          <select
            name="kind"
            value={kind}
            disabled={Boolean(entry)}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="PAYABLE">Conta a pagar</option>
            <option value="RECEIVABLE">Conta a receber</option>
          </select>
        </label>
        <label className="field">
          Descrição
          <input
            name="description"
            defaultValue={entry?.description}
            minLength={2}
            maxLength={1000}
            required
          />
        </label>
        <label className="field">
          Cliente / fornecedor
          <input
            name="counterparty"
            defaultValue={entry?.counterparty}
            minLength={2}
            maxLength={160}
            required
          />
        </label>
        <Select
          name="categoryId"
          label="Categoria"
          value={entry?.categoryId ?? undefined}
          options={categories
            .filter(
              (c) =>
                c.active &&
                c.kind === (kind === "PAYABLE" ? "EXPENSE" : "REVENUE"),
            )
            .map((c) => ({ value: c.id, label: c.name }))}
        />
        <label className="field">
          {entry ? "Valor (R$)" : "Valor total (R$)"}
          <input
            name="amount"
            defaultValue={entry?.amount}
            inputMode="decimal"
            required
            readOnly={Boolean(entry && entry.paidAmount !== "0.00")}
          />
        </label>
        <label className="field">
          {entry ? "Vencimento" : "Primeiro vencimento"}
          <input
            name="dueDate"
            type="date"
            defaultValue={entry?.dueDate ?? todaySaoPaulo(new Date())}
            required
            readOnly={Boolean(entry && entry.paidAmount !== "0.00")}
          />
        </label>
        {!entry && (
          <label className="field">
            Parcelas mensais
            <input
              name="count"
              type="number"
              min={1}
              max={120}
              defaultValue={1}
              required
            />
          </label>
        )}
      </div>
      <p>
        {entry
          ? "Valor e vencimento só podem mudar quando não há baixa vigente."
          : "O valor total será dividido entre as parcelas, com ajuste dos centavos nas primeiras. O lançamento registra uma previsão e não altera o saldo das contas."}
      </p>
    </ActionForm>
  );
}
