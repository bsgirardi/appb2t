"use client";
import { useState } from "react";
import type { CommercialContext } from "@/server/planning/commercial-read";
import type {
  CommercialScenario,
  HypotheticalBatch,
  HypotheticalLine,
} from "@/domain/planning/commercial-types";
import { unknownCompletion } from "@/domain/planning/commercial-types";
import { commercialScenarioSchema } from "@/domain/planning/commercial-validation";
import { Field, FieldGroup, Notice } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { CompletionForm } from "./completion-form";
import { localPlanningTime, planningInstant } from "./commercial-time";
function freshBatch(ctx: CommercialContext, index: number): HypotheticalBatch {
  const l = ctx.lines[index];
  return {
    id: crypto.randomUUID(),
    lineKey: l.lineKey,
    printerId: l.suggestion?.printerId ?? "",
    technology: (l.technology as "FDM" | "RESIN" | undefined) ?? undefined,
    units: l.quantity,
    durationMinutes: l.suggestion?.minutes ?? "",
    prepareMinutes: "",
    removeMinutes: "",
    materialItemId: "",
    colorLabel: "",
    availableAt: ctx.asOf,
    availabilityReason: "",
    durationSource: l.suggestion ? "snapshot" : "manual",
    reviewed: false,
    profileAssumed: false,
    fitAssumed: false,
  };
}
export function CommercialScenarioForm({
  context: ctx,
  busy,
  onChange,
  onSubmit,
}: {
  context: CommercialContext;
  busy: boolean;
  onChange: () => void;
  onSubmit: (v: CommercialScenario) => void;
}) {
  const [s, setScenario] = useState<CommercialScenario>(() => ({
    lines: ctx.lines.map((l, i) => ({
      lineKey: l.lineKey,
      quantity: l.quantity,
      mode: "produce",
      batches: [freshBatch(ctx, i)],
    })),
    completion: unknownCompletion,
  }));
  const [errors, setErrors] = useState<string[]>([]);
  const update = (v: CommercialScenario) => {
    setScenario(v);
    setErrors([]);
    onChange();
  };
  const line = (index: number, value: HypotheticalLine) =>
    update({ ...s, lines: s.lines.map((l, i) => (i === index ? value : l)) });
  const batch = (
    index: number,
    bi: number,
    patch: Partial<HypotheticalBatch>,
    review = true,
  ) => {
    const l = s.lines[index];
    if (l.mode !== "produce") return;
    line(index, {
      ...l,
      batches: l.batches.map((b, i) =>
        i === bi
          ? {
              ...b,
              ...patch,
              ...(review ? { reviewed: false } : {}),
              ...("durationMinutes" in patch
                ? { durationSource: "manual" as const }
                : {}),
            }
          : b,
      ),
    });
  };
  return (
    <form
      className="flex min-w-0 flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = commercialScenarioSchema.safeParse(s);
        if (!parsed.success) {
          setErrors(
            parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
          );
          return;
        }
        onSubmit(parsed.data);
      }}
    >
      <p>
        Simulação temporária. Todos os horários são de São Paulo. Revise cada
        lote; tempos de custo são sugestões provisórias. A disponibilidade de
        material é uma declaração, sem reserva.
      </p>
      {s.lines.map((l, index) => (
        <fieldset
          key={l.lineKey}
          className="flex min-w-0 flex-col gap-3 rounded-lg border p-3"
        >
          <legend>
            {ctx.lines[index].description} · {l.quantity} unidades
          </legend>
          {ctx.lines[index].suggestion ? (
            <p>
              Memória {ctx.lines[index].suggestion!.snapshotId} · quantidade de
              referência {ctx.lines[index].suggestion!.sourceQuantity}. Ao
              dividir, revise a duração de cada lote.
            </p>
          ) : (
            <p>
              Sem memória vigente: declare tecnologia e duração manualmente.
            </p>
          )}
          <label className="field">
            Cobertura do item
            <NativeSelect
              value={l.mode}
              onChange={(e) =>
                line(
                  index,
                  e.target.value === "external"
                    ? {
                        lineKey: l.lineKey,
                        quantity: l.quantity,
                        mode: "external",
                        availableAt: ctx.asOf,
                        reason: "",
                      }
                    : {
                        lineKey: l.lineKey,
                        quantity: l.quantity,
                        mode: "produce",
                        batches: [freshBatch(ctx, index)],
                      },
                )
              }
            >
              <option value="produce">Produzir em lotes hipotéticos</option>
              <option value="external">
                Disponibilidade externa declarada
              </option>
            </NativeSelect>
          </label>
          {l.mode === "external" ? (
            <FieldGroup>
              <Field
                label="Disponibilidade externa (São Paulo)"
                type="datetime-local"
                required
                value={localPlanningTime(l.availableAt)}
                onChange={(e) =>
                  line(index, {
                    ...l,
                    availableAt: planningInstant(e.target.value),
                  })
                }
              />
              <Field
                label="Motivo e fonte da disponibilidade externa"
                required
                value={l.reason}
                onChange={(e) => line(index, { ...l, reason: e.target.value })}
              />
            </FieldGroup>
          ) : (
            <>
              {l.batches.map((b, bi) => (
                <fieldset
                  className="flex min-w-0 flex-col gap-3 rounded-lg border p-3"
                  key={b.id}
                >
                  <legend>Lote hipotético {bi + 1}</legend>
                  <FieldGroup>
                    <label className="field">
                      Tecnologia declarada
                      <NativeSelect
                        required
                        value={
                          b.technology ?? ctx.lines[index].technology ?? ""
                        }
                        onChange={(e) =>
                          batch(index, bi, {
                            technology: e.target.value as "FDM" | "RESIN",
                            printerId: "",
                          })
                        }
                      >
                        <option value="">Selecione</option>
                        <option value="FDM">FDM</option>
                        <option value="RESIN">Resina</option>
                      </NativeSelect>
                    </label>
                    <label className="field">
                      Impressora do cenário
                      <NativeSelect
                        required
                        value={b.printerId}
                        onChange={(e) => {
                          const p = ctx.printers.find(
                            (p) => p.id === e.target.value,
                          );
                          batch(index, bi, {
                            printerId: e.target.value,
                            prepareMinutes: p?.settings?.prepareMinutes ?? "",
                            removeMinutes: p?.settings?.removeMinutes ?? "",
                          });
                        }}
                      >
                        <option value="">Selecione</option>
                        {ctx.printers
                          .filter(
                            (p) =>
                              p.active &&
                              p.technology ===
                                (b.technology ?? ctx.lines[index].technology),
                          )
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </NativeSelect>
                    </label>
                    <Field
                      label="Unidades neste lote"
                      required
                      type="number"
                      min={1}
                      max={l.quantity}
                      value={b.units}
                      onChange={(e) =>
                        batch(index, bi, {
                          units: Number(e.target.value),
                          durationSource: "manual",
                        })
                      }
                    />
                    <Field
                      label="Impressão por lote (minutos)"
                      required
                      inputMode="decimal"
                      value={b.durationMinutes}
                      onChange={(e) =>
                        batch(index, bi, { durationMinutes: e.target.value })
                      }
                    />
                    <Field
                      label="Preparação por lote (minutos)"
                      required
                      inputMode="decimal"
                      value={b.prepareMinutes}
                      onChange={(e) =>
                        batch(index, bi, { prepareMinutes: e.target.value })
                      }
                    />
                    <Field
                      label="Retirada por lote (minutos)"
                      required
                      inputMode="decimal"
                      value={b.removeMinutes}
                      onChange={(e) =>
                        batch(index, bi, { removeMinutes: e.target.value })
                      }
                    />
                    <label className="field">
                      Material do cenário
                      <NativeSelect
                        required
                        value={b.materialItemId}
                        onChange={(e) =>
                          batch(index, bi, { materialItemId: e.target.value })
                        }
                      >
                        <option value="">Selecione</option>
                        {ctx.materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} · disponível {m.available}
                            {!m.inventoried ? " · não inventariado" : ""}
                            {!m.active ? " · inativo" : ""}
                          </option>
                        ))}
                      </NativeSelect>
                    </label>
                    <Field
                      label="Cor declarada"
                      required
                      value={b.colorLabel}
                      onChange={(e) =>
                        batch(index, bi, { colorLabel: e.target.value })
                      }
                    />
                    <Field
                      label="Disponibilidade de material/equipe para o cenário (São Paulo)"
                      required
                      type="datetime-local"
                      value={
                        b.availableAt ? localPlanningTime(b.availableAt) : ""
                      }
                      onChange={(e) =>
                        batch(index, bi, {
                          availableAt: planningInstant(e.target.value),
                        })
                      }
                    />
                    <Field
                      label="Justificativa da disponibilidade"
                      required
                      value={b.availabilityReason}
                      onChange={(e) =>
                        batch(index, bi, { availabilityReason: e.target.value })
                      }
                    />
                    <label>
                      <input
                        type="checkbox"
                        checked={b.profileAssumed}
                        onChange={(e) =>
                          batch(index, bi, { profileAssumed: e.target.checked })
                        }
                      />{" "}
                      Perfil considerado compatível nesta hipótese
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={b.fitAssumed}
                        onChange={(e) =>
                          batch(index, bi, { fitAssumed: e.target.checked })
                        }
                      />{" "}
                      Encaixe na mesa considerado nesta hipótese
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={b.reviewed}
                        onChange={(e) =>
                          batch(
                            index,
                            bi,
                            { reviewed: e.target.checked },
                            false,
                          )
                        }
                      />{" "}
                      Revisei unidades e tempos deste lote hipotético
                    </label>
                    {l.batches.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          line(index, {
                            ...l,
                            batches: l.batches
                              .filter((_, i) => i !== bi)
                              .map((b) => ({
                                ...b,
                                reviewed: false,
                                durationSource: "manual",
                              })),
                          })
                        }
                      >
                        Remover lote {bi + 1}
                      </Button>
                    )}
                  </FieldGroup>
                </fieldset>
              ))}
              <p>
                Distribuído: {l.batches.reduce((n, b) => n + b.units, 0)} de{" "}
                {l.quantity}. A soma deve coincidir exatamente.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={l.batches.length >= 200}
                onClick={() =>
                  line(index, {
                    ...l,
                    batches: [
                      ...l.batches.map((b) => ({
                        ...b,
                        reviewed: false,
                        durationSource: "manual" as const,
                      })),
                      {
                        ...freshBatch(ctx, index),
                        units: 1,
                        durationMinutes: "",
                        durationSource: "manual",
                      },
                    ],
                  })
                }
              >
                Dividir em mais um lote
              </Button>
            </>
          )}
        </fieldset>
      ))}
      <CompletionForm
        value={s.completion}
        onChange={(completion) => update({ ...s, completion })}
      />
      {errors.length > 0 && (
        <Notice>
          <ul>
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </Notice>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Calculando…" : "Simular sem reservar capacidade"}
      </Button>
    </form>
  );
}
