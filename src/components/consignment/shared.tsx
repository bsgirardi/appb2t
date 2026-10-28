"use client";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FieldGroup, Notice } from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { calculateConsignmentLines } from "@/domain/consignment/commercial";
import type {
  CommercialLineInput,
  CommissionModel,
} from "@/domain/consignment/types";
import {
  consignmentCommand,
  type ConsignmentArea,
} from "@/lib/consignment-client";
export const money = (v: string | null) =>
  v === null
    ? "Não apurado"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
        .format(Number(v))
        .replace(/\u00a0/g, " ");
export function CommissionSummary({
  model,
  lines,
}: {
  model: CommissionModel;
  lines: CommercialLineInput[];
}) {
  let t: ReturnType<typeof calculateConsignmentLines> | null = null;
  try {
    t = calculateConsignmentLines(lines);
  } catch {}
  if (!t)
    return (
      <p role="status">
        Preencha quantidade, preço e comissão para conferir os valores.
      </p>
    );
  return (
    <div role="status" className="flex flex-col gap-1">
      <p>Venda bruta: {money(t.gross)}</p>
      <p>
        Comissão {model === "RETIDA" ? "retida" : "separada"}:{" "}
        {money(t.commission)}
      </p>
      <p>Repasse a receber: {money(t.receivable)}</p>
      {model === "SEPARADA" && <p>Comissão a pagar: {money(t.payable)}</p>}
    </div>
  );
}
export function Section({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
export function CommandForm({
  area,
  build,
  onSaved,
  children,
  label,
  description,
}: {
  area: ConsignmentArea;
  build: (data: FormData) => Record<string, unknown>;
  onSaved: (result: unknown) => void;
  children: ReactNode;
  label: string;
  description?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false),
    attempt = useRef<{ payload: string; key: string } | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending.current) return;
        let payload: Record<string, unknown>;
        try {
          payload = build(new FormData(e.currentTarget));
        } catch (err) {
          setError((err as Error).message);
          return;
        }
        const encoded = JSON.stringify(payload);
        if (!attempt.current || attempt.current.payload !== encoded)
          attempt.current = { payload: encoded, key: crypto.randomUUID() };
        pending.current = true;
        setBusy(true);
        setError("");
        try {
          const result = await consignmentCommand(area, {
            ...payload,
            operationKey: attempt.current.key,
          });
          attempt.current = null;
          onSaved(result);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          pending.current = false;
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy} className="min-w-0">
        <FieldGroup>
          {description && <p>{description}</p>}
          {children}
          {error && (
            <Notice>
              {error} Atualize os dados antes de tentar novamente se houver
              conflito.
            </Notice>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Salvando…" : label}
          </Button>
        </FieldGroup>
      </fieldset>
    </form>
  );
}
