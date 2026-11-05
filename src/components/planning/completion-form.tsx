"use client";
import type { CompletionAssumptions } from "@/domain/planning/commercial-types";
import { Field, FieldGroup } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { localPlanningTime, planningInstant } from "./commercial-time";
export function CompletionForm({
  value,
  onChange,
}: {
  value: CompletionAssumptions;
  onChange: (v: CompletionAssumptions) => void;
}) {
  return (
    <FieldGroup>
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend>Acabamento, inspeção e embalagem</legend>
        <label className="field">
          Premissa de liberação
          <NativeSelect
            value={value.post.mode}
            onChange={(e) =>
              onChange({
                ...value,
                post:
                  e.target.value === "unknown"
                    ? { mode: "unknown" }
                    : e.target.value === "waived"
                      ? { mode: "waived", reason: "" }
                      : { mode: "declared", at: "", reason: "" },
              })
            }
          >
            <option value="unknown">Ainda não informado</option>
            <option value="declared">Data de liberação declarada</option>
            <option value="waived">Etapas dispensadas com justificativa</option>
          </NativeSelect>
        </label>
        {value.post.mode !== "unknown" && (
          <>
            <Field
              label="Justificativa da pós-produção"
              required
              value={value.post.reason}
              onChange={(e) =>
                onChange({
                  ...value,
                  post: {
                    ...value.post,
                    reason: e.target.value,
                  } as CompletionAssumptions["post"],
                })
              }
            />
            {value.post.mode === "declared" && (
              <Field
                label="Liberação após pós-produção (São Paulo)"
                type="datetime-local"
                required
                value={value.post.at ? localPlanningTime(value.post.at) : ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    post: {
                      ...value.post,
                      mode: "declared",
                      at: planningInstant(e.target.value),
                      reason: "reason" in value.post ? value.post.reason : "",
                    },
                  })
                }
              />
            )}
          </>
        )}
      </fieldset>
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend>Atendimento ou transporte</legend>
        <label className="field">
          Modalidade da estimativa
          <NativeSelect
            value={value.delivery.mode}
            onChange={(e) =>
              onChange({
                ...value,
                delivery:
                  e.target.value === "unknown"
                    ? { mode: "unknown" }
                    : e.target.value === "pickup"
                      ? { mode: "pickup", at: "", reason: "" }
                      : { mode: "shipping", at: "", reason: "", source: "" },
              })
            }
          >
            <option value="unknown">Ainda não informado</option>
            <option value="pickup">Retirada no local</option>
            <option value="shipping">Envio com chegada declarada</option>
          </NativeSelect>
        </label>
        {value.delivery.mode !== "unknown" && (
          <>
            <Field
              label="Atendimento ou chegada estimada (São Paulo)"
              type="datetime-local"
              required
              value={
                value.delivery.at ? localPlanningTime(value.delivery.at) : ""
              }
              onChange={(e) =>
                onChange({
                  ...value,
                  delivery: {
                    ...value.delivery,
                    at: planningInstant(e.target.value),
                  } as CompletionAssumptions["delivery"],
                })
              }
            />
            <Field
              label="Justificativa do atendimento/transporte"
              required
              value={value.delivery.reason}
              onChange={(e) =>
                onChange({
                  ...value,
                  delivery: {
                    ...value.delivery,
                    reason: e.target.value,
                  } as CompletionAssumptions["delivery"],
                })
              }
            />
            {value.delivery.mode === "shipping" && (
              <Field
                label="Fonte da previsão de transporte"
                required
                value={value.delivery.source}
                onChange={(e) =>
                  onChange({
                    ...value,
                    delivery: {
                      ...value.delivery,
                      mode: "shipping",
                      source: e.target.value,
                      at: "at" in value.delivery ? value.delivery.at : "",
                      reason:
                        "reason" in value.delivery ? value.delivery.reason : "",
                    },
                  })
                }
              />
            )}
          </>
        )}
      </fieldset>
    </FieldGroup>
  );
}
