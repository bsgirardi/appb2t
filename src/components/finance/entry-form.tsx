"use client";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
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
        <Label className="field">
          Tipo
          <NativeSelect
            name="kind"
            value={kind}
            disabled={Boolean(entry)}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="PAYABLE">Conta a pagar</option>
            <option value="RECEIVABLE">Conta a receber</option>
          </NativeSelect>
        </Label>
        <Label className="field">
          Descrição
          <Input
            name="description"
            defaultValue={entry?.description}
            minLength={2}
            maxLength={1000}
            required
          />
        </Label>
        <Label className="field">
          Cliente / fornecedor
          <Input
            name="counterparty"
            defaultValue={entry?.counterparty}
            minLength={2}
            maxLength={160}
            required
          />
        </Label>
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
        <Label className="field">
          {entry ? "Valor (R$)" : "Valor total (R$)"}
          <Input
            name="amount"
            defaultValue={entry?.amount}
            inputMode="decimal"
            required
            readOnly={Boolean(entry && entry.paidAmount !== "0.00")}
          />
        </Label>
        <Label className="field">
          {entry ? "Vencimento" : "Primeiro vencimento"}
          <Input
            name="dueDate"
            type="date"
            defaultValue={entry?.dueDate ?? todaySaoPaulo(new Date())}
            required
            readOnly={Boolean(entry && entry.paidAmount !== "0.00")}
          />
        </Label>
        {!entry && (
          <Label className="field">
            Parcelas mensais
            <Input
              name="count"
              type="number"
              min={1}
              max={120}
              defaultValue={1}
              required
            />
          </Label>
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
