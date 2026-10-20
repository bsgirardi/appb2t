"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  ProductConfiguration,
  ConfigurationField,
  PriceEffect,
} from "@/domain/products/configuration";
import type { ProductImageDTO } from "@/domain/products/types";
function EffectEditor({
  value,
  onChange,
  id,
}: {
  value: PriceEffect;
  onChange: (v: PriceEffect) => void;
  id: string;
}) {
  return (
    <div className="form-grid">
      <div className="field">
        <Label htmlFor={id}>Efeito no preço</Label>
        <NativeSelect
          id={id}
          value={value.kind}
          onChange={(e) =>
            onChange(
              e.target.value === "ADD"
                ? { kind: "ADD", amount: "0.00" }
                : { kind: e.target.value as "NONE" | "CONSULT" },
            )
          }
        >
          <option value="NONE">Sem adicional</option>
          <option value="ADD">Adicional por unidade</option>
          <option value="CONSULT">Sob consulta</option>
        </NativeSelect>
      </div>
      {value.kind === "ADD" && (
        <Field
          label="Adicional em reais"
          inputMode="decimal"
          value={value.amount}
          onChange={(e) =>
            onChange({ kind: "ADD", amount: e.target.value.replace(",", ".") })
          }
        />
      )}
    </div>
  );
}
export function ProductConfigurationEditor({
  value,
  images,
  onChange,
}: {
  value: ProductConfiguration;
  images: ProductImageDTO[];
  onChange: (value: ProductConfiguration) => void;
}) {
  const [remove, setRemove] = useState<string | null>(null);
  const update = (id: string, field: ConfigurationField) =>
    onChange({
      ...value,
      fields: value.fields.map((f) => (f.id === id ? field : f)),
    });
  return (
    <section className="configuration-editor">
      <h2>Personalização do catálogo</h2>
      <p className="muted">
        Cada campo aparece na página do produto e acompanha a linha de
        orçamento. Mudanças podem exigir nova conferência das listas salvas.
      </p>
      <Field
        label="O que acompanha"
        value={value.included}
        maxLength={1000}
        onChange={(e) => onChange({ ...value, included: e.target.value })}
      />
      <Field
        label="Condição de início do prazo"
        value={value.leadTimeCondition}
        maxLength={240}
        onChange={(e) =>
          onChange({ ...value, leadTimeCondition: e.target.value })
        }
        hint="Exemplo: após aprovação da arte. Preencha somente quando aplicável."
      />
      {value.fields.map((f, index) => (
        <fieldset key={f.id} className="configuration-editor-field">
          <legend>Campo {index + 1}</legend>
          <Field
            label={`Nome do campo ${index + 1}`}
            value={f.label}
            maxLength={60}
            onChange={(e) => update(f.id, { ...f, label: e.target.value })}
          />
          <Field
            label={`Ajuda do campo ${index + 1}`}
            value={f.help}
            maxLength={160}
            onChange={(e) => update(f.id, { ...f, help: e.target.value })}
          />
          <div className="field">
            <Label htmlFor={`type-${f.id}`}>Tipo de resposta</Label>
            <NativeSelect
              id={`type-${f.id}`}
              value={f.type}
              onChange={(e) => {
                const base = {
                  id: f.id,
                  label: f.label,
                  help: f.help,
                  required: f.required,
                };
                update(
                  f.id,
                  e.target.value === "SINGLE_CHOICE"
                    ? {
                        ...base,
                        type: "SINGLE_CHOICE",
                        options: [
                          {
                            id: crypto.randomUUID(),
                            label: "Opção",
                            effect: { kind: "NONE" },
                            imageId: null,
                          },
                        ],
                      }
                    : {
                        ...base,
                        type: e.target.value as "SHORT_TEXT" | "LONG_TEXT",
                        maxLength: e.target.value === "SHORT_TEXT" ? 120 : 500,
                        effect: { kind: "NONE" },
                      },
                );
              }}
            >
              <option value="SHORT_TEXT">Texto curto</option>
              <option value="LONG_TEXT">Texto longo</option>
              <option value="SINGLE_CHOICE">Escolha única</option>
            </NativeSelect>
          </div>
          <label className="checkbox-row">
            <Checkbox
              checked={f.required}
              onChange={(e) =>
                update(f.id, { ...f, required: e.target.checked })
              }
            />
            Resposta obrigatória
          </label>
          {f.type !== "SINGLE_CHOICE" ? (
            <>
              <Field
                label={`Limite de caracteres do campo ${index + 1}`}
                type="number"
                min={1}
                max={f.type === "SHORT_TEXT" ? 120 : 500}
                value={f.maxLength}
                onChange={(e) =>
                  update(f.id, { ...f, maxLength: Number(e.target.value) })
                }
              />
              <EffectEditor
                id={`effect-${f.id}`}
                value={f.effect}
                onChange={(effect) => update(f.id, { ...f, effect })}
              />
            </>
          ) : (
            <>
              {f.options.map((o, j) => (
                <fieldset key={o.id} className="configuration-editor-option">
                  <legend>Opção {j + 1}</legend>
                  <Field
                    label={`Nome da opção ${j + 1} do campo ${index + 1}`}
                    value={o.label}
                    maxLength={60}
                    onChange={(e) =>
                      update(f.id, {
                        ...f,
                        options: f.options.map((v) =>
                          v.id === o.id ? { ...o, label: e.target.value } : v,
                        ),
                      })
                    }
                  />
                  <EffectEditor
                    id={`effect-${o.id}`}
                    value={o.effect}
                    onChange={(effect) =>
                      update(f.id, {
                        ...f,
                        options: f.options.map((v) =>
                          v.id === o.id ? { ...o, effect } : v,
                        ),
                      })
                    }
                  />
                  <div className="field">
                    <Label htmlFor={`photo-${o.id}`}>Foto da opção</Label>
                    <NativeSelect
                      id={`photo-${o.id}`}
                      value={
                        images.some((i) => i.id === o.imageId)
                          ? (o.imageId ?? "")
                          : ""
                      }
                      onChange={(e) =>
                        update(f.id, {
                          ...f,
                          options: f.options.map((v) =>
                            v.id === o.id
                              ? { ...o, imageId: e.target.value || null }
                              : v,
                          ),
                        })
                      }
                    >
                      <option value="">Foto geral do produto</option>
                      {images.map((image, k) => (
                        <option key={image.id} value={image.id}>
                          Foto {k + 1}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={f.options.length === 1}
                    onClick={() =>
                      update(f.id, {
                        ...f,
                        options: f.options.filter((v) => v.id !== o.id),
                      })
                    }
                  >
                    Remover opção {j + 1}
                  </Button>
                </fieldset>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={f.options.length >= 20}
                onClick={() =>
                  update(f.id, {
                    ...f,
                    options: [
                      ...f.options,
                      {
                        id: crypto.randomUUID(),
                        label: "Nova opção",
                        effect: { kind: "NONE" },
                        imageId: null,
                      },
                    ],
                  })
                }
              >
                Adicionar opção
              </Button>
              <p className="muted">
                Salve fotos novas na galeria antes de associá-las às opções.
              </p>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={index === 0}
              onClick={() => {
                const fields = [...value.fields];
                [fields[index - 1], fields[index]] = [
                  fields[index],
                  fields[index - 1],
                ];
                onChange({ ...value, fields });
              }}
            >
              Mover campo {index + 1} para cima
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemove(f.id)}
            >
              Remover campo {index + 1}
            </Button>
          </div>
          {remove === f.id && (
            <div role="alert">
              <p>Listas com esta resposta precisarão de revisão.</p>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onChange({
                    ...value,
                    fields: value.fields.filter((v) => v.id !== f.id),
                  });
                  setRemove(null);
                }}
              >
                Confirmar remoção
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRemove(null)}
              >
                Cancelar
              </Button>
            </div>
          )}
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={value.fields.length >= 8}
        onClick={() =>
          onChange({
            ...value,
            fields: [
              ...value.fields,
              {
                id: crypto.randomUUID(),
                label: "Novo campo",
                help: "",
                required: false,
                type: "SHORT_TEXT",
                maxLength: 120,
                effect: { kind: "NONE" },
              },
            ],
          })
        }
      >
        Adicionar campo
      </Button>
    </section>
  );
}
