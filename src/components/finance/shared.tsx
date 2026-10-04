"use client";
import { Pagination as PaginationNav } from "@/components/ui/pagination";

import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    <Label className="field">
      {label}
      <NativeSelect name={name} defaultValue={value ?? ""} required={required}>
        <option value="">Selecione</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </Label>
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
    <Card asChild>
      <form className="commerce-form" onSubmit={send}>
        <h2>{title}</h2>
        {error && <Notice>{error}</Notice>}
        <fieldset disabled={busy}>
          {children}
          <div className="finance-actions">
            <Button variant="default" size="sm" className="">
              {busy ? "Salvando…" : submit}
            </Button>
            {onCancel && (
              <Button
                variant="outline"
                size="sm"
                className=""
                type="button"
                onClick={onCancel}
              >
                Voltar
              </Button>
            )}
          </div>
        </fieldset>
      </form>
    </Card>
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
        <Label className="field">
          Data do estorno
          <Input name="effectiveDate" type="date" required />
        </Label>
        <Label className="field">
          Justificativa
          <Input name="reason" minLength={3} maxLength={2000} required />
        </Label>
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
    <PaginationNav className="finance-actions">
      <span>
        {result.total} registros · Página {result.page} de{" "}
        {Math.max(1, Math.ceil(result.total / result.pageSize))}
      </span>
      {result.page > 1 && (
        <Button asChild variant="outline">
          <Link href={href(result.page - 1)}>Anterior</Link>
        </Button>
      )}
      {result.page * result.pageSize < result.total && (
        <Button asChild variant="outline">
          <Link href={href(result.page + 1)}>Próxima</Link>
        </Button>
      )}
    </PaginationNav>
  );
}
