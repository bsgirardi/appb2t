"use client";
import { ChannelRegistration } from "./channel-registration";
import { TaxFields } from "./tax-fields";

import { useId, useLayoutEffect, useState } from "react";
import { Layers3, Droplets, Check } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

export function GuidedPricingForm(
  props: PricingDraftOptions & {
    onDraftChange?: (value: string) => void;
    embedded?: boolean;
    applicationHint?: string;
    previousCost?: string;
    previousPrice?: string;
  },
) {
  const fieldId = useId();
  const [comparisonDirty, setComparisonDirty] = useState(false);
  const {
    current,
    addChannel,
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
  } = usePricingDraft({
    ...props,
    onApply: async (request) => {
      if (
        comparisonDirty &&
        !window.confirm(
          "A comparação ainda não foi salva. Aplicar a ficha sem salvar essa comparação?",
        )
      )
        return;
      await props.onApply(request);
    },
  });
  const { onDraftChange } = props;
  const fingerprint = JSON.stringify([draft, comparisonDirty]);
  useLayoutEffect(() => {
    onDraftChange?.(fingerprint);
  }, [fingerprint, onDraftChange]);
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
      aria-label="Calculadora de impressão"
      className="flex min-w-0 flex-col gap-5"
    >
      {props.embedded ? (
        <h3>Dados da impressão e formação do preço</h3>
      ) : (
        <header className="page-heading">
          <div>
            <div className="eyebrow">PRECIFICAÇÃO INTELIGENTE</div>
            <h1>
              Calculadora de impressão <span>3D</span>
            </h1>
            <p className="text-muted-foreground">
              Entenda seus custos. Encontre o preço certo para cada peça.
            </p>
          </div>
        </header>
      )}
      {!current.settings && (
        <Notice kind="info">
          Os parâmetros de custo ainda não foram configurados. Solicite a
          configuração ao administrador.
        </Notice>
      )}
      {error && <Notice>{error}</Notice>}
      <fieldset disabled={busy} className="calculator-grid min-w-0">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="section-number">01</span>Dados da impressão
              </CardTitle>
              <CardDescription>
                Escolha as referências e copie os dados do fatiador. Os campos
                marcados são obrigatórios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <FieldGroup>
                  <FieldGroup>
                    <Label>Tecnologia de impressão</Label>
                    <ToggleGroup
                      type="single"
                      value={draft.technology}
                      aria-label="Tecnologia de impressão"
                      className="technology-switch w-full flex-wrap"
                      onValueChange={(value) => {
                        if (!value) return;
                        patch({
                          technology: value as "FDM" | "RESIN",
                          materials: [
                            {
                              ref: emptyRef,
                              consumptionPerUnit: "",
                              fixedWaste: "0",
                            },
                          ],
                          printerRef: emptyRef,
                        });
                      }}
                    >
                      <ToggleGroupItem value="FDM" aria-label="Filamento FDM">
                        <Layers3 data-icon="inline-start" />
                        Filamento <small>FDM</small>
                        {draft.technology === "FDM" && <Check />}
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="RESIN"
                        aria-label="Resina SLA DLP"
                      >
                        <Droplets data-icon="inline-start" />
                        Resina <small>SLA / DLP</small>
                        {draft.technology === "RESIN" && <Check />}
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </FieldGroup>
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
                      <Label htmlFor={`${fieldId}-material-${i}`}>
                        Material {i + 1}
                      </Label>
                      <NativeSelect
                        id={`${fieldId}-material-${i}`}
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
                <p className="text-sm text-muted-foreground">
                  O consumo é por peça; a quantidade multiplica o material. O
                  tempo abaixo é do lote completo.
                </p>
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
                  <Label htmlFor={`${fieldId}-printer`}>Impressora</Label>
                  <NativeSelect
                    id={`${fieldId}-printer`}
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
              <CardTitle className="flex items-center gap-2">
                <span className="section-number">02</span>Formação do preço
              </CardTitle>
              <CardDescription>
                O canal inclui suas taxas. Escolha como deseja formar o preço.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                {draft.tax && (
                  <TaxFields
                    value={draft.tax}
                    profiles={current.tax?.profiles}
                    onChange={(tax) => patch({ tax })}
                  />
                )}
                <div
                  className="field"
                  data-slot="field"
                  data-invalid={!!fieldErrors.channelRef || undefined}
                >
                  <Label htmlFor={`${fieldId}-channel`}>Canal de venda</Label>
                  <NativeSelect
                    id={`${fieldId}-channel`}
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
                  <ChannelRegistration
                    allowed={props.canManageChannels}
                    onSaved={addChannel}
                  />
                </div>
                <div className="field" data-slot="field">
                  <Label htmlFor={`${fieldId}-mode`}>Modalidade de preço</Label>
                  <NativeSelect
                    id={`${fieldId}-mode`}
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
              {(draft.extras.length > 0 ||
                [
                  draft.setupMinutes,
                  draft.finishingMinutesPerUnit,
                  draft.machineMinutesPerUnit,
                  ...draft.materials.map((m) => m.fixedWaste),
                ].some(
                  (value) =>
                    value.trim() !== "" && !/^0+([.,]0+)?$/.test(value),
                )) && (
                <p className="mb-3 text-sm text-muted-foreground">
                  Ajustes em uso: {draft.extras.length} complemento(s);
                  preparação {draft.setupMinutes} min/lote, acabamento{" "}
                  {draft.finishingMinutesPerUnit} min/peça. Perdas fixas e tempo
                  adicional disponíveis abaixo.
                </p>
              )}
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
                        <Label htmlFor={`${fieldId}-extra-${i}`}>
                          Complemento {i + 1}
                        </Label>
                        <NativeSelect
                          id={`${fieldId}-extra-${i}`}
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
                        <Label htmlFor={`${fieldId}-basis-${i}`}>
                          Aplicação {i + 1}
                        </Label>
                        <NativeSelect
                          id={`${fieldId}-basis-${i}`}
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
                      [
                        current.settings?.maintenanceMode === "FIXED_PER_LOT"
                          ? "maintenanceFixedPerLot"
                          : "maintenancePerHour",
                        current.settings?.maintenanceMode === "FIXED_PER_LOT"
                          ? "Manutenção fixa (R$/lote)"
                          : "Manutenção (R$/hora)",
                      ],
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
          className="result-column min-w-0 self-start"
          aria-label="Preço e custos"
        >
          <section className="price-card" aria-label="Resumo do preço">
            <div className="price-top">
              <span>
                {draft.mode === "INFORMED"
                  ? "PREÇO INFORMADO POR PEÇA"
                  : "PREÇO SUGERIDO POR PEÇA"}
              </span>
            </div>
            <div className="sale-price" aria-live="polite">
              {result ? formatBRL(result.offeredUnitPrice) : "R$ —"}
            </div>
            <p>
              {result
                ? `Para ${draft.quantity} peça(s). Taxas do canal incluídas.`
                : "Preencha os dados para encontrar seu preço."}
            </p>
            <div className="price-stats">
              <div>
                <span>Custo completo por peça</span>
                <strong>{result ? formatBRL(result.unitFullCost) : "—"}</strong>
              </div>
              <div>
                <span>
                  {result?.tax?.amount === null
                    ? "Após depreciação, antes de tributos não identificados"
                    : result?.tax
                      ? "Após depreciação e tributos estimados · lote"
                      : "Resultado após depreciação · lote"}
                </span>
                <strong>
                  {result ? formatBRL(result.afterDepreciation) : "—"}
                </strong>
              </div>
            </div>
          </section>
          <Card>
            <CardHeader>
              <CardTitle>Composição do custo e resultado</CardTitle>
              <CardDescription>
                Contribuição e resultado do lote, antes das despesas fixas da
                empresa.
              </CardDescription>
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
              {result && props.previousCost !== undefined && (
                <section
                  aria-label="Conferir custo anterior e revisado"
                  className="flex flex-col gap-2"
                >
                  <h3>Antes e depois · custo por peça</h3>
                  <p>
                    {formatBRL(props.previousCost)} →{" "}
                    {formatBRL(result.unitFullCost)}
                  </p>
                  {props.previousPrice !== undefined && (
                    <p>
                      Preço calculado anterior: {formatBRL(props.previousPrice)}{" "}
                      → {formatBRL(result.offeredUnitPrice)}
                    </p>
                  )}
                  <p>
                    Aplicar a ficha mantém o preço final do produto. Salvar o
                    cadastro é uma ação posterior.
                  </p>
                </section>
              )}
              {result && input && props.fixedQuantity === undefined && (
                <PricingScenarios
                  input={input}
                  onSelect={(quantity) => patch({ quantity })}
                />
              )}
              <ComparisonEditor
                onDirtyChange={setComparisonDirty}
                input={comparisonInput}
                request={draft}
                catalog={current}
                onUseOffer={(channelRef, informedUnitPrice) =>
                  patch({ channelRef, mode: "INFORMED", informedUnitPrice })
                }
              />
            </CardContent>
            <CardFooter>
              <Button type="button" disabled={!result || busy} onClick={apply}>
                {busy
                  ? "Aplicando…"
                  : (props.applyLabel ?? "Aplicar estimativa")}
              </Button>
              <p className="text-sm text-muted-foreground">
                {props.applicationHint ??
                  "O preço do catálogo só muda ao salvar o produto."}
              </p>
            </CardFooter>
          </Card>
        </aside>
      </fieldset>
    </section>
  );
}
