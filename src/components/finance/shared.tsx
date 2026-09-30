"use client";
import Link from "next/link";
import { useRef, useState, type ReactNode, type FormEvent } from "react";
import { api } from "@/lib/client-api";
import { Notice } from "@/components/ui/field";
import type { Page } from "@/domain/shared/pagination";
export function money(value: string | null) {
  if (value === null) return "Sem referência";
  const [integer, fraction = "00"] = value.split(".");
  return `R$ ${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${fraction}`;
}
export const dateLabel = (value: string) =>
  value.split("-").reverse().join("/");
export function Select({
  label,
  name,
  value,
  options,
  required = true,
}: {
  label: string;
  name: string;
  value?: string;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <label className="field">
      {label}
      <select name={name} defaultValue={value ?? ""} required={required}>
        <option value="">Selecione</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function ActionForm({
  title,
  children,
  submit = "Salvar",
  onSubmit,
  onDone,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  submit?: string;
  onSubmit: (data: FormData, operationKey: string) => Promise<unknown>;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    pending = useRef(false),
    intent = useRef<{ payload: string; key: string } | null>(null);
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending.current) return;
    const data = new FormData(e.currentTarget),
      payload = JSON.stringify([...data.entries()]);
    if (intent.current?.payload !== payload)
      intent.current = { payload, key: crypto.randomUUID() };
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await onSubmit(data, intent.current.key);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="card commerce-form" onSubmit={send}>
      <h2>{title}</h2>
      {error && <Notice>{error}</Notice>}
      <fieldset disabled={busy}>
        {children}
        <div className="finance-actions">
          <button className="button primary">
            {busy ? "Salvando…" : submit}
          </button>
          {onCancel && (
            <button
              className="button secondary"
              type="button"
              onClick={onCancel}
            >
              Voltar
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}
export function ReversalForm({
  url,
  onDone,
  onCancel,
}: {
  url: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  return (
    <ActionForm
      title="Estornar registro"
      submit="Registrar estorno"
      onDone={onDone}
      onCancel={onCancel}
      onSubmit={(data, operationKey) =>
        api(url, { ...Object.fromEntries(data), operationKey })
      }
    >
      <p>
        O registro original será preservado. O estorno terá efeito na data
        informada.
      </p>
      <div className="form-grid">
        <label className="field">
          Data do estorno
          <input name="effectiveDate" type="date" required />
        </label>
        <label className="field">
          Justificativa
          <input name="reason" minLength={3} maxLength={2000} required />
        </label>
      </div>
    </ActionForm>
  );
}
export function Pagination({
  result,
  base,
  query = {},
}: {
  result: Page<unknown>;
  base: string;
  query?: Record<string, string>;
}) {
  const href = (page: number) =>
    `${base}?${new URLSearchParams({ ...query, page: String(page) })}`;
  return (
    <div className="finance-actions">
      <span>
        {result.total} registros · Página {result.page} de{" "}
        {Math.max(1, Math.ceil(result.total / result.pageSize))}
      </span>
      {result.page > 1 && (
        <Link className="button secondary" href={href(result.page - 1)}>
          Anterior
        </Link>
      )}
      {result.page * result.pageSize < result.total && (
        <Link className="button secondary" href={href(result.page + 1)}>
          Próxima
        </Link>
      )}
    </div>
  );
}
