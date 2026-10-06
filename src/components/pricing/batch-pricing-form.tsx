"use client";
import { useState, useRef } from "react";
import type {
  PricingCatalogDTO,
  PricingRequest,
  PricingV2Input,
} from "@/domain/pricing/types";
import { calculateV2 } from "@/domain/pricing/calculate";
import {
  resolveCatalogPricing,
  requestFromInput,
} from "@/domain/pricing/resolve";
import { Button } from "@/components/ui/button";
import { Field, Notice } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { api } from "@/lib/client-api";
import { PricingResult } from "./pricing-result";
import { PricingScenarios } from "./pricing-scenarios";
const emptyRef = { id: "", version: 1 };
function initial(c: PricingCatalogDTO): PricingRequest {
  return {
    technology: "FDM",
    quantity: 1,
    materials: [{ ref: emptyRef, consumptionPerUnit: "", fixedWaste: "0" }],
    printerRef: emptyRef,
    machineFixedMinutes: "",
    machineMinutesPerUnit: "0",
    setupMinutes: "0",
    finishingMinutesPerUnit: "0",
    extras: [],
    channelRef: emptyRef,
    mode: "MARKUP",
    informedUnitPrice: "0",
    expectedSettingsVersion: c.settings?.version ?? 1,
  };
}
export function BatchPricingForm({
  catalog,
  initialInput,
  onApply,
  applyLabel = "Aplicar estimativa",
}: {
  catalog: PricingCatalogDTO;
  initialInput?: PricingV2Input;
  onApply: (request: PricingRequest) => Promise<void>;
  applyLabel?: string;
}) {
  const [current, setCurrent] = useState(catalog),
    [review, setReview] = useState<PricingCatalogDTO | null>(null);
  const [draft, setDraft] = useState<PricingRequest>(() =>
    initialInput
      ? requestFromInput(initialInput, catalog.settings?.version ?? 1)
      : initial(catalog),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [touched, setTouched] = useState(!!initialInput);
  const lock = useRef(false);
  const patch = (next: Partial<PricingRequest>) => {
    setTouched(true);
    setDraft((d) => ({ ...d, ...next }));
  };
  let input: PricingV2Input | null = null,
    result: ReturnType<typeof calculateV2> | null = null;
  try {
    input = resolveCatalogPricing(current, draft);
    result = calculateV2(input);
  } catch {}
  const unit = draft.technology === "FDM" ? "g" : "ml";
  const materials = current.materials.filter(
      (m) => m.technology === draft.technology,
    ),
    printers = current.printers.filter(
      (p) => p.technology === draft.technology,
    );
  async function apply() {
    if (lock.current || !result) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await onApply(draft);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function refresh() {
    setError("");
    try {
      setReview(await api<PricingCatalogDTO>("/api/pricing/catalog"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function accept() {
    if (!review) return;
    const ref = (list: { id: string; version: number }[], id: string) => {
      const row = list.find((r) => r.id === id);
      return row ? { id: row.id, version: row.version } : emptyRef;
    };
    setDraft((d) => ({
      ...d,
      expectedSettingsVersion: review.settings?.version ?? 1,
      materials: d.materials.map((m) => ({
        ...m,
        ref: ref(review.materials, m.ref.id),
      })),
      printerRef: ref(review.printers, d.printerRef.id),
      extras: d.extras.map((e) => ({
        ...e,
        ref: ref(review.extras, e.ref.id),
      })),
      channelRef: ref(review.channels, d.channelRef.id),
    }));
    setCurrent(review);
    setReview(null);
  }
  return (
    <section className="space-y-5" aria-label="Cálculo por lote">
      <h2>Cálculo por lote</h2>
      {!current.settings && (
        <Notice kind="info">
          Solicite a configuração dos parâmetros do lote ao administrador. O
          cálculo original continua disponível.
        </Notice>
      )}
      {error && <Notice>{error}</Notice>}
      <fieldset disabled={busy} className="space-y-5">
        <div className="form-grid">
          <Label>
            Tecnologia
            <NativeSelect
              value={draft.technology}
              onChange={(e) =>
                patch({
                  technology: e.target.value as "FDM" | "RESIN",
                  materials: [
                    { ref: emptyRef, consumptionPerUnit: "", fixedWaste: "0" },
                  ],
                  printerRef: emptyRef,
                })
              }
            >
              <option value="FDM">Filamento</option>
              <option value="RESIN">Resina</option>
            </NativeSelect>
          </Label>
          <Field
            label="Quantidade do lote"
            type="number"
            min={1}
            max={100000}
            value={Number.isFinite(draft.quantity) ? draft.quantity : ""}
            onChange={(e) =>
              patch({
                quantity: e.target.value === "" ? NaN : Number(e.target.value),
              })
            }
          />
        </div>
        <section className="space-y-3">
          <h3>Materiais</h3>
          {draft.materials.map((m, i) => (
            <fieldset className="rounded-lg border p-3 space-y-3" key={i}>
              <legend>Material {i + 1}</legend>
              <Label>
                Material {i + 1}
                <NativeSelect
                  value={m.ref.id}
                  onChange={(e) => {
                    const r = materials.find((x) => x.id === e.target.value);
                    patch({
                      materials: draft.materials.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              ref: r
                                ? { id: r.id, version: r.version }
                                : emptyRef,
                            }
                          : x,
                      ),
                    });
                  }}
                >
                  <option value="">Selecione</option>
                  {materials.map((r) => (
                    <option value={r.id} key={r.id}>
                      {r.name} · R$ {r.price}/{unit === "g" ? "kg" : "litro"}
                    </option>
                  ))}
                </NativeSelect>
              </Label>
              <div className="form-grid">
                <Field
                  label={`Consumo por peça ${i + 1} (${unit})`}
                  value={m.consumptionPerUnit}
                  inputMode="decimal"
                  onChange={(e) =>
                    patch({
                      materials: draft.materials.map((x, j) =>
                        j === i
                          ? { ...x, consumptionPerUnit: e.target.value }
                          : x,
                      ),
                    })
                  }
                />
                <Field
                  label={`Desperdício fixo ${i + 1} (${unit})`}
                  value={m.fixedWaste}
                  inputMode="decimal"
                  onChange={(e) =>
                    patch({
                      materials: draft.materials.map((x, j) =>
                        j === i ? { ...x, fixedWaste: e.target.value } : x,
                      ),
                    })
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                disabled={draft.materials.length === 1}
                onClick={() =>
                  patch({
                    materials: draft.materials.filter((_, j) => j !== i),
                  })
                }
              >
                Remover material {i + 1}
              </Button>
            </fieldset>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={draft.materials.length >= 20}
            onClick={() =>
              patch({
                materials: [
                  ...draft.materials,
                  { ref: emptyRef, consumptionPerUnit: "", fixedWaste: "0" },
                ],
              })
            }
          >
            Adicionar material
          </Button>
        </section>
        <section className="space-y-3">
          <h3>Máquina e trabalho</h3>
          <Label>
            Impressora
            <NativeSelect
              value={draft.printerRef.id}
              onChange={(e) => {
                const p = printers.find((x) => x.id === e.target.value);
                patch({
                  printerRef: p ? { id: p.id, version: p.version } : emptyRef,
                });
              }}
            >
              <option value="">Selecione</option>
              {printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Label>
          <div className="form-grid">
            {(
              [
                ["machineFixedMinutes", "Tempo fixo de máquina (min/lote)"],
                [
                  "machineMinutesPerUnit",
                  "Tempo equivalente de máquina (min/peça)",
                ],
                ["setupMinutes", "Preparação (min/lote)"],
                ["finishingMinutesPerUnit", "Acabamento (min/peça)"],
              ] as const
            ).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                inputMode="decimal"
                value={draft[key]}
                onChange={(e) => patch({ [key]: e.target.value })}
              />
            ))}
          </div>
          <p className="muted">
            O tempo fixo é contado uma vez; o equivalente por peça é
            multiplicado pela quantidade. O sistema não calcula a ocupação da
            placa.
          </p>
        </section>
        <section className="space-y-3">
          <h3>Complementos e embalagem</h3>
          {draft.extras.map((x, i) => (
            <div className="rounded-lg border p-3 space-y-2" key={i}>
              <Label>
                Complemento {i + 1}
                <NativeSelect
                  value={x.ref.id}
                  onChange={(e) => {
                    const r = current.extras.find(
                      (x) => x.id === e.target.value,
                    );
                    patch({
                      extras: draft.extras.map((v, j) =>
                        j === i
                          ? {
                              ...v,
                              ref: r
                                ? { id: r.id, version: r.version }
                                : emptyRef,
                            }
                          : v,
                      ),
                    });
                  }}
                >
                  <option value="">Selecione</option>
                  {current.extras.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · R$ {r.unitCost}
                    </option>
                  ))}
                </NativeSelect>
              </Label>
              <div className="form-grid">
                <Field
                  label={`Quantidade do complemento ${i + 1}`}
                  value={x.quantity}
                  onChange={(e) =>
                    patch({
                      extras: draft.extras.map((v, j) =>
                        j === i ? { ...v, quantity: e.target.value } : v,
                      ),
                    })
                  }
                />
                <Label>
                  Aplicação {i + 1}
                  <NativeSelect
                    value={x.basis}
                    onChange={(e) =>
                      patch({
                        extras: draft.extras.map((v, j) =>
                          j === i
                            ? { ...v, basis: e.target.value as "LOT" | "UNIT" }
                            : v,
                        ),
                      })
                    }
                  >
                    <option value="UNIT">Por peça</option>
                    <option value="LOT">Por lote</option>
                  </NativeSelect>
                </Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  patch({ extras: draft.extras.filter((_, j) => j !== i) })
                }
              >
                Remover complemento {i + 1}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={draft.extras.length >= 30}
            onClick={() =>
              patch({
                extras: [
                  ...draft.extras,
                  { ref: emptyRef, basis: "UNIT", quantity: "1" },
                ],
              })
            }
          >
            Adicionar complemento
          </Button>
        </section>
        <div className="form-grid">
          <Label>
            Canal de venda
            <NativeSelect
              value={draft.channelRef.id}
              onChange={(e) => {
                const c = current.channels.find((x) => x.id === e.target.value);
                patch({
                  channelRef: c ? { id: c.id, version: c.version } : emptyRef,
                });
              }}
            >
              <option value="">Selecione</option>
              {current.channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Label>
          <Label>
            Modalidade de preço
            <NativeSelect
              value={draft.mode}
              onChange={(e) =>
                patch({ mode: e.target.value as PricingRequest["mode"] })
              }
            >
              <option value="MARKUP">Markup sobre custo completo</option>
              <option value="CONTRIBUTION">Margem de contribuição alvo</option>
              <option value="INFORMED">Preço informado</option>
            </NativeSelect>
          </Label>
          {draft.mode === "INFORMED" ? (
            <Field
              label="Preço unitário informado (R$)"
              value={draft.informedUnitPrice}
              onChange={(e) => patch({ informedUnitPrice: e.target.value })}
            />
          ) : (
            <Field
              label={draft.mode === "MARKUP" ? "Markup (%)" : "Margem alvo (%)"}
              readOnly
              value={
                (draft.mode === "MARKUP"
                  ? current.settings?.markupPercent
                  : current.settings?.targetMarginPercent) ?? ""
              }
            />
          )}
        </div>
        <details>
          <summary>Parâmetros administrativos usados</summary>
          <div className="form-grid">
            {(
              [
                ["energyRate", "Tarifa de energia (R$/kWh)"],
                ["maintenancePerHour", "Manutenção (R$/hora)"],
                ["laborPerHour", "Trabalho (R$/hora)"],
                ["failurePercent", "Reserva de falhas (%)"],
              ] as const
            ).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                readOnly
                value={current.settings?.[key] ?? ""}
              />
            ))}
          </div>
          <p>
            Depreciação calculada pela aquisição e capacidade de uso cadastradas
            na impressora.
          </p>
        </details>
        <Button type="button" variant="outline" onClick={refresh}>
          Revisar parâmetros atuais
        </Button>
        {review && (
          <section className="rounded-lg border p-4 space-y-3">
            <h3>Revisar alterações antes de aplicar</h3>
            <p>
              Energia: {current.settings?.energyRate ?? "não configurada"} →{" "}
              {review.settings?.energyRate ?? "não configurada"} R$/kWh.
              Trabalho: {current.settings?.laborPerHour ?? "não configurado"} →{" "}
              {review.settings?.laborPerHour ?? "não configurado"} R$/hora.
            </p>
            <p>
              Manutenção: {current.settings?.maintenancePerHour ?? "—"} →{" "}
              {review.settings?.maintenancePerHour ?? "—"}. Falhas:{" "}
              {current.settings?.failurePercent ?? "—"} →{" "}
              {review.settings?.failurePercent ?? "—"}%. Markup:{" "}
              {current.settings?.markupPercent ?? "—"} →{" "}
              {review.settings?.markupPercent ?? "—"}%. Margem:{" "}
              {current.settings?.targetMarginPercent ?? "—"} →{" "}
              {review.settings?.targetMarginPercent ?? "—"}%.
            </p>
            <ul>
              {review.materials.map((m) => (
                <li key={m.id}>
                  {m.name}:{" "}
                  {current.materials.find((x) => x.id === m.id)?.price ??
                    "novo"}{" "}
                  → {m.price} R$/kg ou litro.
                </li>
              ))}
            </ul>
            <ul>
              {current.materials
                .filter((m) => !review.materials.some((n) => n.id === m.id))
                .map((m) => (
                  <li key={m.id}>{m.name}: indisponível no catálogo atual.</li>
                ))}
            </ul>
            <ul>
              {review.printers.map((p) => {
                const old = current.printers.find((x) => x.id === p.id);
                return (
                  <li key={p.id}>
                    {p.name} — Potência: {old?.watts ?? "novo"} → {p.watts} W.
                    Aquisição: {old?.acquisitionCost ?? "—"} →{" "}
                    {p.acquisitionCost}. Meses: {old?.amortizationMonths ?? "—"}{" "}
                    → {p.amortizationMonths}. Dias/mês:{" "}
                    {old?.daysPerMonth ?? "—"} → {p.daysPerMonth}. Horas/dia:{" "}
                    {old?.hoursPerDay ?? "—"} → {p.hoursPerDay}.
                  </li>
                );
              })}
            </ul>
            <ul>
              {review.extras.map((x) => (
                <li key={x.id}>
                  {x.name}:{" "}
                  {current.extras.find((e) => e.id === x.id)?.unitCost ??
                    "novo"}{" "}
                  → {x.unitCost} R$.
                </li>
              ))}
            </ul>
            <ul>
              {review.channels.map((c) => {
                const old = current.channels.find((x) => x.id === c.id);
                return (
                  <li key={c.id}>
                    {c.name} — Custo fixo: {old?.fixedCost ?? "novo"} →{" "}
                    {c.fixedCost}. Taxas:{" "}
                    {old?.fees
                      .map((f) => `${f.label}: ${f.percent}%`)
                      .join(", ") || "nenhuma"}{" "}
                    →{" "}
                    {c.fees
                      .map((f) => `${f.label}: ${f.percent}%`)
                      .join(", ") || "nenhuma"}
                    .
                  </li>
                );
              })}
            </ul>
            <ul>
              {[...current.printers, ...current.extras, ...current.channels]
                .filter(
                  (x) =>
                    ![
                      ...review.printers,
                      ...review.extras,
                      ...review.channels,
                    ].some((n) => n.id === x.id),
                )
                .map((x) => (
                  <li key={x.id}>{x.name}: indisponível no catálogo atual.</li>
                ))}
            </ul>
            <p>Referências indisponíveis precisarão ser substituídas.</p>
            <Button type="button" onClick={accept}>
              Aplicar parâmetros revisados
            </Button>{" "}
            <Button
              type="button"
              variant="outline"
              onClick={() => setReview(null)}
            >
              Manter parâmetros anteriores
            </Button>
          </section>
        )}
        {result && input ? (
          <>
            <PricingResult input={input} result={result} />
            <PricingScenarios
              input={input}
              onSelect={(quantity) => patch({ quantity })}
            />
          </>
        ) : (
          touched && (
            <Notice>
              Confira materiais, consumo, tempo e parâmetros. Margem e taxas
              devem somar menos de 100%.
            </Notice>
          )
        )}
        <Button type="button" disabled={!result || busy} onClick={apply}>
          {busy ? "Aplicando…" : applyLabel}
        </Button>
      </fieldset>
    </section>
  );
}
