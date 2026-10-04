"use client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { AccountDTO, EntryDTO } from "@/domain/finance/types";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { api } from "@/lib/client-api";
import { ActionForm, Select, money } from "./shared";
export function SettlementForm({
  entry,
  accounts,
  onDone,
  onCancel,
}: {
  entry: EntryDTO;
  accounts: AccountDTO[];
  onDone: () => void;
  onCancel: () => void;
}) {
  return (
    <ActionForm
      title={
        entry.kind === "RECEIVABLE"
          ? "Registrar recebimento"
          : "Registrar pagamento"
      }
      submit="Registrar baixa"
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(data, operationKey) =>
        api("/api/finance/settlements", {
          ...Object.fromEntries(data),
          entryId: entry.id,
          expectedVersion: entry.version,
          operationKey,
        })
      }
    >
      <p>
        Registre um pagamento já realizado fora da aplicação. Este registro não
        envia dinheiro nem emite cobrança.
      </p>
      <p>
        Saldo restante: <strong>{money(entry.remainingAmount)}</strong>. Você
        pode registrar uma baixa parcial.
      </p>
      <div className="form-grid">
        <Select
          name="accountId"
          label="Conta"
          options={accounts
            .filter((a) => a.active)
            .map((a) => ({
              value: a.id,
              label: `${a.name} · ${money(a.balance)}`,
            }))}
        />
        <Label className="field">
          Valor (R$)
          <Input
            name="amount"
            inputMode="decimal"
            defaultValue={entry.remainingAmount}
            required
          />
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
        <Select
          name="method"
          label="Forma de pagamento"
          value="PIX"
          options={[
            { value: "PIX", label: "Pix" },
            { value: "CASH", label: "Dinheiro" },
            { value: "CARD", label: "Cartão" },
            { value: "BOLETO", label: "Boleto" },
            { value: "TRANSFER", label: "Transferência" },
            { value: "OTHER", label: "Outra" },
          ]}
        />
        <Label className="field">
          Observações
          <Input name="notes" maxLength={2000} />
        </Label>
      </div>
    </ActionForm>
  );
}
