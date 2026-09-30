"use client";
import { useRef, useState } from "react";
import Decimal from "decimal.js";
import type { InstallmentInput } from "@/domain/commerce/types";
import {
  splitInstallments,
  validateInstallments,
} from "@/domain/commerce/installments";
import { todaySaoPaulo, addMonthsClamped } from "@/domain/commerce/dates";
import { parseMoney } from "@/domain/commerce/validation";
import { Notice, Field } from "@/components/ui/field";
export function InstallmentEditor({
  total,
  onConfirm,
}: {
  total: string;
  onConfirm: (rows: InstallmentInput[], key: string) => Promise<void>;
}) {
  const [date, setDate] = useState(() => todaySaoPaulo(new Date())),
    [count, setCount] = useState(1),
    [entry, setEntry] = useState("0.00"),
    [rows, setRows] = useState(() =>
      splitInstallments(total, 1, todaySaoPaulo(new Date())),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const intent = useRef<{ payload: string; key: string } | null>(null),
    pending = useRef(false);
  function divide() {
    try {
      const upfront = new Decimal(parseMoney(entry));
      if (upfront.gte(total))
        throw new Error(
          "A entrada deve ser menor que o total; para pagamento único, use uma parcela sem entrada.",
        );
      const installments = splitInstallments(
        new Decimal(total).minus(upfront).toFixed(2),
        count,
        date,
      );
      const result = upfront.gt(0)
        ? [
            { number: 1, amount: upfront.toFixed(2), dueDate: date },
            ...installments.map((i) => ({
              ...i,
              number: i.number + 1,
              dueDate: addMonthsClamped(date, i.number),
            })),
          ]
        : installments;
      validateInstallments(total, result);
      setRows(result);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function confirm() {
    if (pending.current) return;
    setError("");
    try {
      const valid = validateInstallments(total, rows);
      const payload = JSON.stringify({ total, rows: valid });
      if (intent.current?.payload !== payload)
        intent.current = { payload, key: crypto.randomUUID() };
      pending.current = true;
      setBusy(true);
      await onConfirm(valid, intent.current.key);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="card commerce-form">
      <h2>Revisar parcelamento</h2>
      <p>
        Total da venda: <strong>R$ {total}</strong>. A confirmação cria contas a
        receber. O pagamento será registrado no financeiro.
      </p>
      {error && <Notice>{error}</Notice>}
      <fieldset disabled={busy}>
        <div className="form-grid">
          <Field
            label="Entrada opcional (R$)"
            inputMode="decimal"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
          />
          <Field
            label="Número de parcelas"
            type="number"
            min={1}
            max={120}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
          <Field
            label="Primeiro vencimento / entrada"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <button type="button" className="button secondary" onClick={divide}>
          Dividir valor
        </button>
        {rows.map((row, index) => (
          <div className="form-grid" key={row.number}>
            <Field
              label={`Valor da parcela ${row.number}`}
              inputMode="decimal"
              value={row.amount}
              onChange={(e) =>
                setRows((old) =>
                  old.map((r, i) =>
                    i === index ? { ...r, amount: e.target.value } : r,
                  ),
                )
              }
            />
            <Field
              label={`Vencimento da parcela ${row.number}`}
              type="date"
              value={row.dueDate}
              onChange={(e) =>
                setRows((old) =>
                  old.map((r, i) =>
                    i === index ? { ...r, dueDate: e.target.value } : r,
                  ),
                )
              }
            />
          </div>
        ))}
      </fieldset>
      <button
        type="button"
        className="button primary"
        disabled={busy}
        onClick={confirm}
      >
        {busy ? "Confirmando…" : "Confirmar parcelamento"}
      </button>
    </section>
  );
}
