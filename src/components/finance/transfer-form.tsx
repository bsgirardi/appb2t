"use client";
import type { AccountDTO } from "@/domain/finance/types";
import { api } from "@/lib/client-api";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { ActionForm, Select } from "./shared";
export function TransferForm({
  accounts,
  onDone,
  onCancel,
}: {
  accounts: AccountDTO[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const options = accounts
    .filter((a) => a.active)
    .map((a) => ({ value: a.id, label: a.name }));
  return (
    <ActionForm
      title="Registrar transferência interna"
      submit="Registrar transferência"
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(data, operationKey) =>
        api("/api/finance/transfers", {
          ...Object.fromEntries(data),
          operationKey,
        })
      }
    >
      <p>
        Registre uma transferência já realizada entre suas contas. Este cadastro
        não envia dinheiro.
      </p>
      <div className="form-grid">
        <Select
          name="fromAccountId"
          label="Conta de origem"
          options={options}
        />
        <Select name="toAccountId" label="Conta de destino" options={options} />
        <label className="field">
          Valor (R$)
          <input name="amount" inputMode="decimal" required />
        </label>
        <label className="field">
          Data efetiva
          <input
            name="effectiveDate"
            type="date"
            defaultValue={todaySaoPaulo(new Date())}
            max={todaySaoPaulo(new Date())}
            required
          />
        </label>
        <label className="field">
          Descrição
          <input name="description" minLength={3} maxLength={2000} required />
        </label>
      </div>
    </ActionForm>
  );
}
