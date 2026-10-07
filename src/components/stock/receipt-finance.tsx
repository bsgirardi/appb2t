"use client";
import { useState } from "react";
import { ActionForm, Select, money } from "@/components/finance/shared";
import { Field, Notice } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { StockReceiptDTO } from "@/server/stock/queries";
import type { CategoryDTO, EntryDTO } from "@/domain/finance/types";
import { stockCommand } from "@/lib/stock-client";
import { api } from "@/lib/client-api";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { splitInstallments } from "@/domain/commerce/installments";
import { text } from "./shared";
import { StockDecimal as D } from "@/domain/stock/quantities";
export function ReceiptFinance({
  receipt,
  categories,
  onDone,
  onCancel,
}: {
  receipt: StockReceiptDTO;
  categories: CategoryDTO[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState("CREATE"),
    [entries, setEntries] = useState<EntryDTO[]>([]),
    [error, setError] = useState(""),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  async function load(next = 1) {
    try {
      const r = await api<{ items: EntryDTO[]; total: number }>(
        `/api/finance/entries?kind=PAYABLE&counterparty=${encodeURIComponent(receipt.supplier)}&page=${next}&pageSize=100`,
      );
      setEntries(r.items);
      setPage(next);
      setTotal(r.total);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <ActionForm
      revision={receipt.version}
      title={`Conferir compra · ${receipt.supplier}`}
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(f, operationKey) => {
        const total = text(f, "total");
        return stockCommand("CONFIRM_RECEIPT", {
          receiptId: receipt.id,
          expectedVersion: receipt.version,
          operationKey,
          total,
          lines: receipt.lines.map((l) => ({
            id: l.id,
            value: text(f, `line-${l.id}`),
          })),
          mode,
          ...(mode === "CREATE"
            ? {
                categoryId: text(f, "categoryId"),
                installments: splitInstallments(
                  total,
                  Number(text(f, "count")),
                  text(f, "dueDate"),
                ),
              }
            : { entryIds: Object.keys(selected) }),
        });
      }}
    >
      <p>
        Esta confirmação registra custos e obrigações; não recebe material
        novamente e não efetua pagamento.
      </p>
      {receipt.lines.map((l) => (
        <Field
          key={l.id}
          label={`${l.name} · ${l.quantity} ${l.unit} · valor total (R$)`}
          name={`line-${l.id}`}
          inputMode="decimal"
          required
        />
      ))}
      <Field
        label="Total da compra (R$)"
        name="total"
        required
        inputMode="decimal"
      />
      <label className="field">
        Destino financeiro
        <select
          className="w-full rounded border bg-background p-2"
          name="mode"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            if (e.target.value === "LINK") void load();
          }}
        >
          <option value="CREATE">Gerar contas a pagar</option>
          <option value="LINK">Vincular obrigação existente</option>
        </select>
      </label>
      {mode === "CREATE" ? (
        <>
          <Select
            label="Categoria de despesa"
            name="categoryId"
            options={categories
              .filter((c) => c.active && c.kind === "EXPENSE")
              .map((c) => ({ value: c.id, label: c.name }))}
          />
          <Field
            label="Número de parcelas mensais"
            name="count"
            type="number"
            min={1}
            max={120}
            defaultValue="1"
            required
          />
          <Field
            label="Primeiro vencimento"
            name="dueDate"
            type="date"
            defaultValue={todaySaoPaulo(new Date())}
            required
          />
          <p>
            O total será dividido em parcelas mensais; centavos restantes ficam
            nas primeiras parcelas.
          </p>
        </>
      ) : (
        <>
          <input
            type="hidden"
            name="selectedEntries"
            value={Object.keys(selected).sort().join(",")}
          />
          <p>
            {Object.keys(selected).length} parcelas selecionadas ·{" "}
            {money(
              Object.values(selected)
                .reduce((sum, value) => sum.plus(value), new D(0))
                .toFixed(2),
            )}
          </p>
          <p>
            Selecione todas as parcelas do grupo. Valores e fornecedor devem
            corresponder à compra.
          </p>
          {error && <Notice>{error}</Notice>}
          {entries
            .filter((e) => !e.canceledAt && !e.receiptId)
            .map((e) => (
              <label key={e.id} className="flex gap-2 rounded border p-2">
                <input
                  type="checkbox"
                  name="entryId"
                  value={e.id}
                  checked={e.id in selected}
                  onChange={(event) =>
                    setSelected((old) => {
                      const next = { ...old };
                      if (event.target.checked) next[e.id] = e.amount;
                      else delete next[e.id];
                      return next;
                    })
                  }
                />
                <span>
                  {e.description} · {e.dueDate} · {money(e.amount)} · {e.state}
                </span>
              </label>
            ))}
          {entries.length === 0 && (
            <p>Nenhuma obrigação encontrada para este fornecedor.</p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={page === 1}
              onClick={() => void load(page - 1)}
            >
              Anteriores
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page * 100 >= total}
              onClick={() => void load(page + 1)}
            >
              Próximas
            </Button>
          </div>
        </>
      )}
    </ActionForm>
  );
}
export function ReturnFinance({
  receipt,
  movementId,
  onDone,
  onCancel,
}: {
  receipt: StockReceiptDTO;
  movementId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState("KEEP"),
    [entries, setEntries] = useState<EntryDTO[]>([]),
    [error, setError] = useState("");
  async function load() {
    try {
      const rows = await Promise.all(
        (receipt.entryIds ?? []).map((id) =>
          api<EntryDTO>(`/api/finance/entries/${id}`),
        ),
      );
      setEntries(rows);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <ActionForm
      revision={receipt.version}
      title="Resolver financeiro da devolução"
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(f, operationKey) =>
        stockCommand("RETURN_FINANCE", {
          movementId,
          expectedVersion: receipt.version,
          operationKey,
          mode,
          reason: text(f, "reason"),
          entries:
            mode === "KEEP"
              ? []
              : entries
                  .filter((e) => text(f, `amount-${e.id}`) !== "")
                  .map((e) => ({
                    id: e.id,
                    amount: text(f, `amount-${e.id}`),
                  })),
        })
      }
    >
      <label className="field">
        Decisão
        <select
          name="mode"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            if (e.target.value === "REDUCE") void load();
          }}
          className="w-full rounded border bg-background p-2"
        >
          <option value="KEEP">Manter obrigação com justificativa</option>
          <option value="REDUCE">Reduzir ou cancelar principal</option>
        </select>
      </label>
      {error && <Notice>{error}</Notice>}
      {mode === "REDUCE" &&
        entries
          .filter((e) => !e.canceledAt)
          .map((e) => (
            <Field
              key={e.id}
              label={`${e.description} · atual ${money(e.amount)} · novo principal (R$)`}
              name={`amount-${e.id}`}
              inputMode="decimal"
              hint="Deixe vazio para manter esta parcela. Zero cancela. Baixas precisam ser estornadas antes."
            />
          ))}
      <Field
        label="Justificativa da decisão"
        name="reason"
        required
        minLength={3}
        maxLength={2000}
      />
    </ActionForm>
  );
}
