"use client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
        <Label className="field">
          Valor (R$)
          <Input name="amount" inputMode="decimal" required />
        </Label>
        <Label className="field">
          Data efetiva
          <Input
            name="effectiveDate"
            type="date"
            defaultValue={todaySaoPaulo(new Date())}
            max={todaySaoPaulo(new Date())}
            required
          />
        </Label>
        <Label className="field">
          Descrição
          <Input name="description" minLength={3} maxLength={2000} required />
        </Label>
      </div>
    </ActionForm>
  );
}
