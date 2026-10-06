"use client";
import { useState } from "react";
import { api } from "@/lib/client-api";
import type {
  PricingCatalogDTO,
  PricingSettingsValues,
  PricingChannelDTO,
  PricingExtraDTO,
} from "@/domain/pricing/types";
import { Field, Notice } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
const rateFields: [keyof PricingSettingsValues, string][] = [
  ["energyRate", "Tarifa de energia (R$/kWh)"],
  ["maintenancePerHour", "Manutenção (R$/hora)"],
  ["failurePercent", "Reserva para falhas (%)"],
  ["laborPerHour", "Trabalho (R$/hora)"],
  ["markupPercent", "Markup padrão (%)"],
  ["targetMarginPercent", "Margem alvo padrão (%)"],
];
export function PricingSettingsPanel({
  initialCatalog,
}: {
  initialCatalog: PricingCatalogDTO;
}) {
  const [catalog, setCatalog] = useState(initialCatalog),
    [rates, setRates] = useState<PricingSettingsValues>(
      () =>
        Object.fromEntries(
          rateFields.map(([key]) => [
            key,
            initialCatalog.settings?.[key] ?? "",
          ]),
        ) as unknown as PricingSettingsValues,
    );
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const settings = await api<NonNullable<PricingCatalogDTO["settings"]>>(
        "/api/pricing/settings",
        { ...rates, expectedVersion: catalog.settings?.version ?? 0 },
      );
      setCatalog({ ...catalog, settings });
      setMessage(
        "Parâmetros salvos. Estimativas anteriores permanecem iguais.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5">
      <h2>Precificação por lote</h2>
      <p>
        Configure valores reais da B2T. Informe zero quando o custo não se
        aplicar. Alterações não recalculam fichas ou documentos anteriores.
      </p>
      {error && <Notice>{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}
      <div className="form-grid">
        {rateFields.map(([key, label]) => (
          <Field
            key={key}
            label={label}
            inputMode="decimal"
            value={rates[key]}
            disabled={busy}
            onChange={(e) => setRates({ ...rates, [key]: e.target.value })}
          />
        ))}
      </div>
      <Button type="button" onClick={save} disabled={busy}>
        Salvar parâmetros do lote
      </Button>
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
    </section>
  );
}
function PricingReferenceEditor({
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
    <section className="rounded-lg border p-4 space-y-3">
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
      <fieldset disabled={busy} className="space-y-3">
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
