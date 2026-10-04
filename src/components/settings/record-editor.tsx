"use client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useState, type FormEvent } from "react";
import { Save, X } from "lucide-react";
import { api, ApiError } from "@/lib/client-api";
import { parseDecimalInput } from "@/domain/calculation/validation";
import { Field, Notice } from "@/components/ui/field";
import { calculate, formatBRL } from "@/domain/calculation/calculate";
export type EditorField = {
  key: string;
  label: string;
  kind:
    | "text"
    | "decimal"
    | "integer"
    | "select"
    | "checkbox"
    | "password"
    | "email";
  hint?: string;
  suffix?: string;
  options?: { value: string; label: string }[];
};
export type EditorRecord = Record<string, string | number | boolean>;
export function RecordEditor({
  title,
  endpoint,
  fields,
  initial,
  onSaved,
  onCancel,
  onReload,
  method,
}: {
  title: string;
  endpoint: string;
  fields: EditorField[];
  initial: EditorRecord;
  onSaved: () => void;
  onCancel: () => void;
  onReload: () => void;
  method?: string;
}) {
  const [draft, setDraft] = useState(initial),
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}),
    [conflict, setConflict] = useState(false),
    [pending, setPending] = useState(false);
  function update(key: string, value: string | boolean) {
    setDraft((old) => ({ ...old, [key]: value }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setConflict(false);
    setPending(true);
    try {
      const body: Record<string, unknown> = {};
      for (const f of fields) {
        const value = draft[f.key];
        body[f.key] =
          f.kind === "decimal"
            ? parseDecimalInput(String(value ?? ""))
            : f.kind === "integer"
              ? String(value).trim() === ""
                ? NaN
                : Number(value)
              : value;
      }
      if (initial.version !== undefined) body.expectedVersion = initial.version;
      await api(endpoint, body, method ?? (initial.id ? "PATCH" : "POST"));
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) {
        setConflict(e.code === "CONFLICT");
        setFieldErrors(e.fields ?? {});
      }
    } finally {
      setPending(false);
    }
  }
  let machineHint = "";
  if ("acquisitionCost" in draft) {
    try {
      const r = calculate({
        technology: "FDM",
        consumption: "1",
        hours: 1,
        minutes: 0,
        materialPrice: "0",
        printer: {
          acquisitionCost: String(draft.acquisitionCost).replace(",", "."),
          amortizationMonths: Number(draft.amortizationMonths),
          daysPerMonth: Number(draft.daysPerMonth),
          hoursPerDay: String(draft.hoursPerDay).replace(",", "."),
          watts: "0",
        },
        settings: {
          energyRate: "0",
          maintenancePercent: "0",
          failurePercent: "0",
          finishingPercent: "0",
          fixation: "0",
          markupPercent: "0",
        },
      });
      machineHint = `Amortização calculada: ${formatBRL(r.hourlyMachine)} / hora`;
    } catch {}
  }
  return (
    <Card asChild>
      <section className="editor-card">
        <div className="section-heading">
          <h2>{title}</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            className=""
            onClick={onCancel}
            aria-label="Fechar edição"
            disabled={pending}
          >
            <X size={20} />
          </Button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid editor-fields">
            {fields.map((f) => (
              <div key={f.key}>
                {f.kind === "select" ? (
                  <div className="field">
                    <Label htmlFor={`edit-${f.key}`}>{f.label}</Label>
                    <NativeSelect
                      id={`edit-${f.key}`}
                      value={String(draft[f.key] ?? "")}
                      onChange={(e) => update(f.key, e.target.value)}
                    >
                      {f.options?.map((o) => (
                        <option value={o.value} key={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                ) : f.kind === "checkbox" ? (
                  <Label className="checkbox-field">
                    <Checkbox
                      checked={!!draft[f.key]}
                      onChange={(e) => update(f.key, e.target.checked)}
                    />
                    {f.label}
                  </Label>
                ) : (
                  <Field
                    label={f.label}
                    value={String(draft[f.key] ?? "")}
                    onChange={(e) => update(f.key, e.target.value)}
                    type={
                      f.kind === "password"
                        ? "password"
                        : f.kind === "email"
                          ? "email"
                          : "text"
                    }
                    inputMode={
                      f.kind === "decimal"
                        ? "decimal"
                        : f.kind === "integer"
                          ? "numeric"
                          : undefined
                    }
                    required
                    hint={f.hint}
                    suffix={f.suffix}
                    autoComplete={
                      f.kind === "password" ? "new-password" : undefined
                    }
                    maxLength={
                      f.kind === "password"
                        ? 128
                        : f.kind === "email"
                          ? 254
                          : f.kind === "text"
                            ? 100
                            : 24
                    }
                  />
                )}
                {fieldErrors[f.key] && (
                  <small className="field-error">{fieldErrors[f.key]}</small>
                )}
              </div>
            ))}
          </div>
          {machineHint && <div className="machine-hint">{machineHint}</div>}
          {error && <Notice>{error}</Notice>}
          {conflict && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              className=""
              onClick={onReload}
            >
              Recarregar registro
            </Button>
          )}
          <div className="form-actions">
            <Button
              variant="outline"
              size="sm"
              type="button"
              className=""
              onClick={onCancel}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button variant="default" size="sm" className="" disabled={pending}>
              <Save size={16} />
              {pending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </section>
    </Card>
  );
}
