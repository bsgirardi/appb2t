"use client";

import { formatBRL } from "@/domain/calculation/calculate";
import { usePricingDraft, type PricingDraftOptions } from "./use-pricing-draft";
import { PrintingDurationFields } from "./printing-duration-fields";
import { PricingReferenceReview } from "./pricing-reference-review";
import { PricingResult } from "./pricing-result";
import { PricingScenarios } from "./pricing-scenarios";
import { ComparisonEditor } from "./comparisons/comparison-editor";
import { FilterPanel } from "@/components/admin/filter-panel";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Field, FieldGroup, Notice } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { PricingRequest } from "@/domain/pricing/types";

const emptyRef = { id: "", version: 1 };

export function GuidedPricingForm(props: PricingDraftOptions) {
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
    result,
    fieldErrors,
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
  } = usePricingDraft(props);
  const advancedErrors =
    touched &&
    Object.keys(fieldErrors).some(
      (key) =>
        /^(extras|setupMinutes|finishingMinutesPerUnit|machineMinutesPerUnit)/.test(
          key,
        ) || key.endsWith("fixedWaste"),
    );
  return (
    <section
      aria-label="Calculadora V3"
      className="flex min-w-0 flex-col gap-5"
    >
      <header>
        <h1>Calculadora V3</h1>
        <p className="text-muted-foreground">
          Do fatiador ao preço de venda. Informe a peça e acompanhe seus custos.
        </p>
      </header>
      {!current.settings && (
        <Notice kind="info">
          Os parâmetros de custo ainda não foram configurados. Solicite a
          configuração ao administrador.
        </Notice>
      )}
      {error && <Notice>{error}</Notice>}
      <fieldset
        disabled={busy}
        className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
      >
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>1. Sua impressão</CardTitle>
              <CardDescription>
                Escolha as referências e copie os dados do fatiador. Os campos
                marcados são obrigatórios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <div className="field" data-slot="field">
                    <Label htmlFor="v3-technology">Tecnologia</Label>
                    <NativeSelect
                      id="v3-technology"
                      value={draft.technology}
                      onChange={(e) =>
                        patch({
                          technology: e.target.value as "FDM" | "RESIN",
                          materials: [
                            {
                              ref: emptyRef,
                              consumptionPerUnit: "",
                              fixedWaste: "0",
                            },
                          ],
                          printerRef: emptyRef,
                        })
                      }
                    >
                      <option value="FDM">Filamento · FDM</option>
                      <option value="RESIN">Resina · SLA / DLP</option>
                    </NativeSelect>
                  </div>
                  <Field
                    {...fieldProps("quantity")}
                    required
                    label="Quantidade do lote"
                    type="number"
                    min={1}
                    max={100000}
                    readOnly={props.fixedQuantity !== undefined}
                    value={
                      Number.isFinite(draft.quantity) ? draft.quantity : ""
                    }
                    onChange={(e) =>
                      patch({
                        quantity:
                          e.target.value === "" ? NaN : Number(e.target.value),
                      })
                    }
                  />
                </FieldGroup>
                {draft.materials.map((material, i) => (
                  <FieldGroup key={i} className="grid gap-4 sm:grid-cols-2">
                    <div
                      className="field"
                      data-slot="field"
                      data-invalid={
                        !!fieldErrors[`materials.${i}.ref`] || undefined
                      }
                    >
                      <Label htmlFor={`v3-material-${i}`}>
                        Material {i + 1}
                      </Label>
                      <NativeSelect
                        id={`v3-material-${i}`}
                        required
                        {...selectProps(`materials.${i}.ref`)}
                        value={material.ref.id}
                        onChange={(e) => {
                          const selected = materials.find(
                            (row) => row.id === e.target.value,
                          );
                          patch({
                            materials: draft.materials.map((row, j) =>
                              j === i
                                ? {
                                    ...row,
                                    ref: selected
                                      ? {
                                          id: selected.id,
                                          version: selected.version,
                                        }
                                      : emptyRef,
                                  }
                                : row,
                            ),
                          });
                        }}
                      >
                        <option value="">Selecione o material</option>
                        {materials.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.name}
                          </option>
                        ))}
                      </NativeSelect>
                      {hint(`materials.${i}.ref`)}
                    </div>
                    <Field
                      {...fieldProps(`materials.${i}.consumptionPerUnit`)}
                      required
                      label={`Consumo por peça ${i + 1} (${unit})`}
                      inputMode="decimal"
                      value={material.consumptionPerUnit}
                      onChange={(e) =>
                        patch({
                          materials: draft.materials.map((row, j) =>
                            j === i
                              ? { ...row, consumptionPerUnit: e.target.value }
                              : row,
                          ),
                        })
                      }
                    />
                    {draft.materials.length > 1 && (
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() =>
                          patch({
                            materials: draft.materials.filter(
                              (_, j) => j !== i,
                            ),
                          })
                        }
                      >
                        Remover material {i + 1}
                      </Button>
                    )}
                  </FieldGroup>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={draft.materials.length >= 20}
                  onClick={() =>
                    patch({
                      materials: [
                        ...draft.materials,
                        {
                          ref: emptyRef,
                          consumptionPerUnit: "",
                          fixedWaste: "0",
                        },
                      ],
                    })
                  }
                >
                  Adicionar outro material
                </Button>
                <div
                  className="field"
                  data-slot="field"
                  data-invalid={!!fieldErrors.printerRef || undefined}
                >
                  <Label htmlFor="v3-printer">Impressora</Label>
                  <NativeSelect
                    id="v3-printer"
                    required
                    {...selectProps("printerRef")}
                    value={draft.printerRef.id}
                    onChange={(e) => {
                      const selected = printers.find(
                        (row) => row.id === e.target.value,
                      );
                      patch({
                        printerRef: selected
                          ? { id: selected.id, version: selected.version }
                          : emptyRef,
                      });
                    }}
                  >
                    <option value="">Selecione a impressora</option>
                    {printers.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </NativeSelect>
                  {hint("printerRef")}
                </div>
                <PrintingDurationFields
                  value={draft.machineFixedMinutes}
                  onChange={(machineFixedMinutes) =>
                    patch({ machineFixedMinutes })
                  }
                  error={touched ? fieldErrors.machineFixedMinutes : undefined}
                />
                <p className="text-sm text-muted-foreground">
                  Informe o tempo total de impressão do lote. Para 30 minutos,
                  use 0 horas e 30 minutos.
                </p>
              </FieldGroup>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>2. Sua venda</CardTitle>
              <CardDescription>
                O canal inclui suas taxas. Escolha como deseja formar o preço.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div
                  className="field"
                  data-slot="field"
                  data-invalid={!!fieldErrors.channelRef || undefined}
                >
                  <Label htmlFor="v3-channel">Canal de venda</Label>
                  <NativeSelect
                    id="v3-channel"
                    required
                    {...selectProps("channelRef")}
                    value={draft.channelRef.id}
                    onChange={(e) => {
                      const selected = current.channels.find(
                        (row) => row.id === e.target.value,
                      );
                      patch({
                        channelRef: selected
                          ? { id: selected.id, version: selected.version }
                          : emptyRef,
                      });
                    }}
                  >
                    <option value="">Selecione o canal</option>
                    {current.channels.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </NativeSelect>
                  {hint("channelRef")}
                </div>
                <div className="field" data-slot="field">
                  <Label htmlFor="v3-mode">Modalidade de preço</Label>
                  <NativeSelect
                    id="v3-mode"
                    value={draft.mode}
                    onChange={(e) =>
                      patch({ mode: e.target.value as PricingRequest["mode"] })
                    }
                  >
                    <option value="MARKUP">
                      Acréscimo sobre o custo · markup
                    </option>
                    <option value="CONTRIBUTION">
                      Margem de contribuição alvo
                    </option>
                    <option value="INFORMED">Quero informar o preço</option>
                  </NativeSelect>
                </div>
                {draft.mode === "INFORMED" ? (
                  <Field
                    {...fieldProps("informedUnitPrice")}
                    required
                    label="Preço unitário informado (R$)"
                    inputMode="decimal"
                    value={draft.informedUnitPrice}
                    onChange={(e) =>
                      patch({ informedUnitPrice: e.target.value })
                    }
                  />
                ) : (
                  <Field
                    {...fieldProps(
                      draft.mode === "MARKUP"
                        ? "markupPercent"
                        : "targetMarginPercent",
                    )}
                    readOnly
                    label={
                      draft.mode === "MARKUP" ? "Markup (%)" : "Margem alvo (%)"
                    }
                    value={
                      (draft.mode === "MARKUP"
                        ? current.settings?.markupPercent
                        : current.settings?.targetMarginPercent) ?? ""
                    }
                  />
                )}
              </FieldGroup>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <FilterPanel title="Ajustes avançados" hasErrors={advancedErrors}>
                <FieldGroup>
                  <p className="text-sm text-muted-foreground">
                    Use zero quando não houver desperdício, preparação ou
                    acabamento. O tempo adicional por peça será somado ao tempo
                    total informado acima.
                  </p>
                  {draft.materials.map((material, i) => (
                    <Field
                      key={i}
                      {...fieldProps(`materials.${i}.fixedWaste`)}
                      label={`Desperdício fixo ${i + 1} (${unit}/lote)`}
                      inputMode="decimal"
                      value={material.fixedWaste}
                      onChange={(e) =>
                        patch({
                          materials: draft.materials.map((row, j) =>
                            j === i
                              ? { ...row, fixedWaste: e.target.value }
                              : row,
                          ),
                        })
                      }
                    />
                  ))}
                  {(
                    [
                      [
                        "machineMinutesPerUnit",
                        "Tempo adicional de máquina (min/peça)",
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
                  {draft.extras.map((extra, i) => (
                    <FieldGroup key={i}>
                      <div className="field" data-slot="field">
                        <Label htmlFor={`v3-extra-${i}`}>
                          Complemento {i + 1}
                        </Label>
                        <NativeSelect
                          id={`v3-extra-${i}`}
                          {...selectProps(`extras.${i}.ref`)}
                          value={extra.ref.id}
                          onChange={(e) => {
                            const selected = current.extras.find(
                              (row) => row.id === e.target.value,
                            );
                            patch({
                              extras: draft.extras.map((row, j) =>
                                j === i
                                  ? {
                                      ...row,
                                      ref: selected
                                        ? {
                                            id: selected.id,
                                            version: selected.version,
                                          }
                                        : emptyRef,
                                    }
                                  : row,
                              ),
                            });
                          }}
                        >
                          <option value="">Selecione</option>
                          {current.extras.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.name}
                            </option>
                          ))}
                        </NativeSelect>
                        {hint(`extras.${i}.ref`)}
                      </div>
                      <Field
                        {...fieldProps(`extras.${i}.quantity`)}
                        label={`Quantidade do complemento ${i + 1}`}
                        inputMode="decimal"
                        value={extra.quantity}
                        onChange={(e) =>
                          patch({
                            extras: draft.extras.map((row, j) =>
                              j === i
                                ? { ...row, quantity: e.target.value }
                                : row,
                            ),
                          })
                        }
                      />
                      <div className="field" data-slot="field">
                        <Label htmlFor={`v3-basis-${i}`}>
                          Aplicação {i + 1}
                        </Label>
                        <NativeSelect
                          id={`v3-basis-${i}`}
                          value={extra.basis}
                          onChange={(e) =>
                            patch({
                              extras: draft.extras.map((row, j) =>
                                j === i
                                  ? {
                                      ...row,
                                      basis: e.target.value as "LOT" | "UNIT",
                                    }
                                  : row,
                              ),
                            })
                          }
                        >
                          <option value="UNIT">Por peça</option>
                          <option value="LOT">Por lote</option>
                        </NativeSelect>
                      </div>
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() =>
                          patch({
                            extras: draft.extras.filter((_, j) => j !== i),
                          })
                        }
                      >
                        Remover complemento {i + 1}
                      </Button>
                    </FieldGroup>
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
                </FieldGroup>
              </FilterPanel>
              <FilterPanel title="Parâmetros de custo e atualização">
                <FieldGroup>
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
                  <PricingReferenceReview
                    current={current}
                    review={review}
                    refresh={refresh}
                    accept={accept}
                    onKeep={() => setReview(null)}
                  />
                </FieldGroup>
              </FilterPanel>
            </CardContent>
          </Card>
        </div>
        <aside
          className="min-w-0 self-start xl:sticky xl:top-5"
          aria-label="Resultado da Calculadora V3"
        >
          <Card>
            <CardHeader>
              <CardTitle>3. Seu preço e custos</CardTitle>
              <CardDescription>
                O resultado acompanha os dados preenchidos.
              </CardDescription>
              {result && (
                <output
                  aria-label="Preço calculado por peça"
                  className="text-4xl font-semibold text-primary tabular-nums"
                >
                  {formatBRL(result.offeredUnitPrice)}
                </output>
              )}
            </CardHeader>
            <CardContent>
              {result && input ? (
                <PricingResult input={input} result={result} />
              ) : (
                <Notice kind="info">
                  {validationMessage ||
                    (touched
                      ? "Revise os campos sinalizados para calcular o preço."
                      : "Escolha material, impressora e canal. Informe consumo, quantidade e tempo para ver o preço.")}
                </Notice>
              )}
              {result && input && props.fixedQuantity === undefined && (
                <PricingScenarios
                  input={input}
                  onSelect={(quantity) => patch({ quantity })}
                />
              )}
              {result && input && <ComparisonEditor input={input} request={draft} catalog={current} onUseOffer={(channelRef, informedUnitPrice) => patch({ channelRef, mode: "INFORMED", informedUnitPrice })} />}
            </CardContent>
            <CardFooter>
              <Button type="button" disabled={!result || busy} onClick={apply}>
                {busy
                  ? "Aplicando…"
                  : (props.applyLabel ?? "Aplicar estimativa")}
              </Button>
              <p className="text-sm text-muted-foreground">
                O preço do catálogo só muda ao salvar o produto.
              </p>
            </CardFooter>
          </Card>
        </aside>
      </fieldset>
    </section>
  );
}
