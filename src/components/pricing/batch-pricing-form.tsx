"use client";
import { usePricingDraft } from "./use-pricing-draft";
import { FormSection } from "@/components/admin/form-section";

import type {
  PricingCatalogDTO,
  PricingRequest,
  PricingV2Input,
} from "@/domain/pricing/types";
import { Button } from "@/components/ui/button";
import { Field, Notice } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PricingReferenceReview } from "./pricing-reference-review";
import { PricingResult } from "./pricing-result";
import { PricingScenarios } from "./pricing-scenarios";
import { ComparisonEditor } from "./comparisons/comparison-editor";
const emptyRef = { id: "", version: 1 };
export function BatchPricingForm({
  catalog,
  initialInput,
  initialRequest,
  onApply,
  applyLabel = "Aplicar estimativa",
  fixedQuantity,
}: {
  catalog: PricingCatalogDTO;
  initialInput?: PricingV2Input;
  initialRequest?: PricingRequest;
  onApply: (request: PricingRequest) => Promise<void>;
  applyLabel?: string;
  fixedQuantity?: number;
}) {
  const {
    current,
    review,
    setReview,
    draft,
    busy,
    error,
    touched,
    patch,
    input,
    comparisonInput,
    result,
    validationMessage,
    fieldProps,
    selectProps,
    hint,
    unit,
    materials,
    printers,
    apply,
    refresh,
    accept,
  } = usePricingDraft({
    catalog,
    initialInput,
    initialRequest,
    onApply,
    fixedQuantity,
  });
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
          <Label className="grid gap-2">
            Tecnologia
            <NativeSelect
              {...selectProps("technology")}
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
            {hint("technology")}
          </Label>
          <Field
            {...fieldProps("quantity")}
            required
            label="Quantidade do lote"
            readOnly={fixedQuantity !== undefined}
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
              <Label className="grid gap-2">
                Material {i + 1}
                <NativeSelect
                  {...selectProps(`materials.${i}.ref`)}
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
                {hint(`materials.${i}.ref`)}
              </Label>
              <div className="form-grid">
                <Field
                  {...fieldProps(`materials.${i}.consumptionPerUnit`)}
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
                  {...fieldProps(`materials.${i}.fixedWaste`)}
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
          <Label className="grid gap-2">
            Impressora
            <NativeSelect
              {...selectProps("printerRef")}
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
            {hint("printerRef")}
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
                {...fieldProps(key)}
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
        <FormSection
          id="batch-extras"
          title="Complementos e embalagem"
          collapsible
          defaultOpen={false}
          hasErrors={draft.extras.length > 0}
          summary={`${draft.extras.length} complementos no cálculo`}
        >
          {draft.extras.map((x, i) => (
            <div className="rounded-lg border p-3 space-y-2" key={i}>
              <Label className="grid gap-2">
                Complemento {i + 1}
                <NativeSelect
                  {...selectProps(`extras.${i}.ref`)}
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
                {hint(`extras.${i}.ref`)}
              </Label>
              <div className="form-grid">
                <Field
                  {...fieldProps(`extras.${i}.quantity`)}
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
                <Label className="grid gap-2">
                  Aplicação {i + 1}
                  <NativeSelect
                    {...selectProps(`extras.${i}.basis`)}
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
                  {hint(`extras.${i}.basis`)}
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
        </FormSection>
        <div className="form-grid">
          <Label className="grid gap-2">
            Canal de venda
            <NativeSelect
              {...selectProps("channelRef")}
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
            {hint("channelRef")}
          </Label>
          <Label className="grid gap-2">
            Modalidade de preço
            <NativeSelect
              {...selectProps("mode")}
              value={draft.mode}
              onChange={(e) =>
                patch({ mode: e.target.value as PricingRequest["mode"] })
              }
            >
              <option value="MARKUP">Markup sobre custo completo</option>
              <option value="CONTRIBUTION">Margem de contribuição alvo</option>
              <option value="INFORMED">Preço informado</option>
            </NativeSelect>
            {hint("mode")}
          </Label>
          {draft.mode === "INFORMED" ? (
            <Field
              {...fieldProps("informedUnitPrice")}
              label="Preço unitário informado (R$)"
              value={draft.informedUnitPrice}
              onChange={(e) => patch({ informedUnitPrice: e.target.value })}
            />
          ) : (
            <Field
              {...fieldProps(
                draft.mode === "MARKUP"
                  ? "markupPercent"
                  : "targetMarginPercent",
              )}
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
                {...fieldProps(key)}
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
        <PricingReferenceReview
          current={current}
          review={review}
          refresh={refresh}
          accept={accept}
          onKeep={() => setReview(null)}
        />
        {result && input ? (
          <>
            <PricingResult input={input} result={result} />

            {fixedQuantity === undefined && (
              <PricingScenarios
                input={input}
                onSelect={(quantity) => patch({ quantity })}
              />
            )}
          </>
        ) : (
          touched && (
            <Notice>
              {validationMessage ||
                "Confira os campos sinalizados antes de aplicar a estimativa."}
            </Notice>
          )
        )}
        <ComparisonEditor
          input={comparisonInput}
          request={draft}
          catalog={current}
          onUseOffer={(channelRef, informedUnitPrice) =>
            patch({ channelRef, mode: "INFORMED", informedUnitPrice })
          }
        />
        <Button type="button" disabled={!result || busy} onClick={apply}>
          {busy ? "Aplicando…" : applyLabel}
        </Button>
      </fieldset>
    </section>
  );
}
