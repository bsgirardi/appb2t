"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/client-api";
import { NativeSelect } from "@/components/ui/native-select";
import type {
  PricingCatalogDTO,
  PricingSettingsValues,
  PricingChannelDTO,
  PricingExtraDTO,
} from "@/domain/pricing/types";
import { Field, FieldGroup, Notice } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
const rateFields: [keyof PricingSettingsValues, string][] = [
  ["energyRate", "Tarifa de energia (R$/kWh)"],
  ["maintenancePerHour", "Manutenção (R$/hora)"],
  ["maintenanceFixedPerLot", "Manutenção fixa (R$/lote)"],
  ["failurePercent", "Reserva para falhas (%)"],
  ["laborPerHour", "Trabalho (R$/hora)"],
  ["markupPercent", "Markup padrão (%)"],
  ["targetMarginPercent", "Margem alvo padrão (%)"],
];
function usePricingSettings(initialCatalog: PricingCatalogDTO) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [rates, setRates] = useState<PricingSettingsValues>(
    () =>
      Object.fromEntries(
        rateFields.map(([key]) => [
          key,
          initialCatalog.settings?.[key] ??
            ([
              "markupPercent",
              "targetMarginPercent",
              "maintenanceFixedPerLot",
            ].includes(key)
              ? "0"
              : ""),
        ]),
      ) as unknown as PricingSettingsValues,
  );
  const [maintenanceMode, setMaintenanceMode] = useState<
    "HOURLY" | "FIXED_PER_LOT"
  >(initialCatalog.settings?.maintenanceMode ?? "HOURLY");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    setFieldErrors({});
    setMessage("");
    try {
      const settings = await api<NonNullable<PricingCatalogDTO["settings"]>>(
        "/api/pricing/settings",
        {
          ...rates,
          maintenanceMode,
          maintenancePerHour:
            maintenanceMode === "FIXED_PER_LOT" &&
            !rates.maintenancePerHour.trim()
              ? "0"
              : rates.maintenancePerHour,
          expectedVersion: catalog.settings?.version ?? 0,
        },
      );
      setCatalog((c) => ({ ...c, settings }));
      setMessage(
        "Parâmetros salvos. Estimativas anteriores permanecem iguais.",
      );
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setFieldErrors(e.fields ?? {});
    } finally {
      setBusy(false);
    }
  }
  return {
    catalog,
    setCatalog,
    rates,
    setRates,
    maintenanceMode,
    setMaintenanceMode,
    fieldErrors,
    error,
    message,
    busy,
    save,
  };
}
const PricingSettingsContext = createContext<ReturnType<
  typeof usePricingSettings
> | null>(null);
export function PricingSettingsProvider({
  initialCatalog,
  children,
}: {
  initialCatalog: PricingCatalogDTO;
  children: ReactNode;
}) {
  const value = usePricingSettings(initialCatalog);
  return (
    <PricingSettingsContext.Provider value={value}>
      {children}
    </PricingSettingsContext.Provider>
  );
}
function useSettings() {
  const value = useContext(PricingSettingsContext);
  if (!value) throw new Error("PricingSettingsProvider ausente");
  return value;
}
export function PricingRatesPanel({
  section = "all",
}: {
  section?: "production" | "pricing" | "all";
}) {
  const {
    rates,
    setRates,
    maintenanceMode,
    setMaintenanceMode,
    fieldErrors,
    error,
    message,
    busy,
    save,
  } = useSettings();
  const fields = rateFields.filter(
    ([key]) =>
      (key !== "maintenancePerHour" || maintenanceMode === "HOURLY") &&
      (key !== "maintenanceFixedPerLot" ||
        maintenanceMode === "FIXED_PER_LOT") &&
      (section === "all" ||
        (section === "pricing"
          ? ["markupPercent", "targetMarginPercent"].includes(key)
          : !["markupPercent", "targetMarginPercent"].includes(key))),
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {section === "production"
            ? "Custos de produção"
            : section === "pricing"
              ? "Padrões de preço"
              : "Parâmetros da calculadora"}
        </CardTitle>
        <CardDescription>
          Configure os valores usados pela calculadora. Informe zero quando o
          custo não se aplicar. Alterações não recalculam fichas ou documentos
          anteriores.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <Notice>
            {error}
            {Object.keys(fieldErrors).length > 0 && (
              <ul>
                {Object.entries(fieldErrors).map(([key, detail]) => (
                  <li key={key}>
                    {rateFields.find(([name]) => name === key)?.[1] ?? key}:{" "}
                    {detail}
                  </li>
                ))}
              </ul>
            )}
          </Notice>
        )}
        {message && <Notice kind="success">{message}</Notice>}
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          {section !== "pricing" && (
            <Label className="flex flex-col gap-2">
              Cobrança da manutenção
              <NativeSelect
                value={maintenanceMode}
                disabled={busy}
                onChange={(e) =>
                  setMaintenanceMode(
                    e.target.value as "HOURLY" | "FIXED_PER_LOT",
                  )
                }
              >
                <option value="HOURLY">Por hora de máquina (R$/hora)</option>
                <option value="FIXED_PER_LOT">
                  Valor fixo por produção/lote (R$)
                </option>
              </NativeSelect>
            </Label>
          )}
          {fields.map(([key, label]) => (
            <Field
              key={key}
              label={label}
              inputMode="decimal"
              value={rates[key]}
              error={fieldErrors[key]}
              disabled={busy}
              onChange={(e) =>
                setRates((r) => ({ ...r, [key]: e.target.value }))
              }
            />
          ))}
        </FieldGroup>
        {section !== "all" && (
          <p className="text-sm text-muted-foreground">
            Custos de produção e padrões de preço são salvos juntos. Na primeira
            configuração, markup e margem começam em 0%; ajuste-os na aba
            Precificação.
          </p>
        )}
        {section !== "pricing" && (
          <p className="text-sm text-muted-foreground">
            A manutenção fixa é cobrada uma vez por produção/lote, sem
            multiplicar pelas horas ou pela quantidade de peças.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button type="button" onClick={save} disabled={busy}>
          {section === "production"
            ? "Salvar custos de produção"
            : section === "pricing"
              ? "Salvar padrões de preço"
              : "Salvar parâmetros do lote"}
        </Button>
      </CardFooter>
    </Card>
  );
}
export function PricingReferencesPanel() {
  const { catalog, setCatalog } = useSettings();
  return (
    <div className="flex flex-col gap-5">
      <PricingReferenceEditor
        kind="channels"
        rows={catalog.channels}
        onSaved={(row) =>
          setCatalog((c) => ({
            ...c,
            channels: [
              ...c.channels.filter((x) => x.id !== row.id),
              row as PricingChannelDTO,
            ],
          }))
        }
      />
      <PricingReferenceEditor
        kind="extras"
        rows={catalog.extras}
        onSaved={(row) =>
          setCatalog((c) => ({
            ...c,
            extras: [
              ...c.extras.filter((x) => x.id !== row.id),
              row as PricingExtraDTO,
            ],
          }))
        }
      />
    </div>
  );
}
export function PricingSettingsPanel({
  initialCatalog,
}: {
  initialCatalog: PricingCatalogDTO;
}) {
  return (
    <PricingSettingsProvider initialCatalog={initialCatalog}>
      <section className="flex flex-col gap-5">
        <PricingRatesPanel />
        <PricingReferencesPanel />
      </section>
    </PricingSettingsProvider>
  );
}
export function PricingReferenceEditor({
  kind,
  rows,
  onSaved,
}: {
  kind: "channels" | "extras";
  rows: (PricingChannelDTO | PricingExtraDTO)[];
  onSaved: (row: PricingChannelDTO | PricingExtraDTO) => void;
}) {
  const blank = {
    name: "",
    amount: "",
    active: true,
    fees: [] as { label: string; percent: string }[],
    expectedVersion: 0,
    id: undefined as string | undefined,
  };
  const [draft, setDraft] = useState(blank),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const isChannel = kind === "channels",
    label = isChannel ? "canal" : "complemento";
  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        id: draft.id,
        name: draft.name,
        active: draft.active,
        expectedVersion: draft.expectedVersion,
        ...(isChannel
          ? { fixedCost: draft.amount, fees: draft.fees }
          : { unitCost: draft.amount }),
      };
      onSaved(await api(`/api/pricing/${kind}`, payload));
      setDraft(blank);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <h3>{isChannel ? "Canais de venda" : "Complementos e embalagens"}</h3>
      <ul>
        {rows.map((row) => (
          <li
            className="flex flex-wrap justify-between gap-3 py-2"
            key={row.id}
          >
            {row.name}
            {row.active ? "" : " · inativo"}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setDraft({
                  id: row.id,
                  name: row.name,
                  active: row.active,
                  expectedVersion: row.version,
                  amount: "fixedCost" in row ? row.fixedCost : row.unitCost,
                  fees: "fees" in row ? row.fees : [],
                })
              }
            >
              Editar {row.name}
            </Button>
          </li>
        ))}
      </ul>
      {error && <Notice>{error}</Notice>}
      <fieldset disabled={busy} className="flex flex-col gap-3">
        <Field
          label={`Nome do ${label}`}
          value={draft.name}
          maxLength={120}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <Field
          label={
            isChannel
              ? "Despesa fixa por lote (R$)"
              : "Custo unitário do complemento (R$)"
          }
          value={draft.amount}
          onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
        />
        {isChannel && (
          <>
            <p>
              Taxas incidem sobre a receita dos itens e são somadas. Para canal
              sem taxa, deixe a lista vazia e confirme a despesa fixa.
            </p>
            {draft.fees.map((fee, i) => (
              <div className="form-grid" key={i}>
                <Field
                  label={`Nome da taxa ${i + 1}`}
                  value={fee.label}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      fees: draft.fees.map((f, j) =>
                        i === j ? { ...f, label: e.target.value } : f,
                      ),
                    })
                  }
                />
                <Field
                  label={`Taxa ${i + 1} (%)`}
                  value={fee.percent}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      fees: draft.fees.map((f, j) =>
                        i === j ? { ...f, percent: e.target.value } : f,
                      ),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      fees: draft.fees.filter((_, j) => j !== i),
                    })
                  }
                >
                  Remover taxa {i + 1}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={draft.fees.length >= 20}
              onClick={() =>
                setDraft({
                  ...draft,
                  fees: [...draft.fees, { label: "", percent: "" }],
                })
              }
            >
              Adicionar taxa
            </Button>
          </>
        )}
        <Label className="flex gap-2">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          />
          Cadastro ativo
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={save}>
            Salvar {label}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraft(blank);
              setError("");
            }}
          >
            Novo {label}
          </Button>
        </div>
      </fieldset>
    </section>
  );
}
