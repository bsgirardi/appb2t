"use client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import {
  availabilityLabels,
  type Availability,
  type CommercialFields,
} from "@/domain/products/commercial";
export function ProductCommercialEditor({
  value,
  onChange,
}: {
  value: CommercialFields;
  onChange: (value: CommercialFields) => void;
}) {
  return (
    <Card asChild>
      <section className="">
        <h2>Informações para venda</h2>
        <Field
          label="Código do produto (SKU)"
          value={value.sku ?? ""}
          maxLength={64}
          onChange={(e) => onChange({ ...value, sku: e.target.value })}
          hint="Código único. Use letras, números, ponto, hífen ou sublinhado."
        />
        <Field
          label="Descrição curta"
          value={value.shortDescription ?? ""}
          maxLength={240}
          onChange={(e) =>
            onChange({ ...value, shortDescription: e.target.value })
          }
          hint="Resumo exibido nos cards do catálogo. Opcional."
        />
        <div className="field">
          <Label htmlFor="product-availability">Disponibilidade</Label>
          <NativeSelect
            id="product-availability"
            value={value.availability ?? "CONSULT"}
            onChange={(e) =>
              onChange({
                ...value,
                availability: e.target.value as Availability,
              })
            }
          >
            {Object.entries(availabilityLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Field
          label="Prazo de produção (dias úteis)"
          type="number"
          min={1}
          max={365}
          step={1}
          value={value.leadTimeDays ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              leadTimeDays:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
          hint="Deixe vazio se depender de consulta. Não inclui o prazo de entrega."
        />
        <div className="form-grid">
          {(["colors", "sizes"] as const).map((key) => (
            <div className="field" key={key}>
              <Label htmlFor={`product-${key}`}>
                {key === "colors"
                  ? "Cores disponíveis"
                  : "Tamanhos disponíveis"}
              </Label>
              <Textarea
                id={`product-${key}`}
                value={(value[key] ?? []).join("\n")}
                onChange={(e) =>
                  onChange({ ...value, [key]: e.target.value.split("\n") })
                }
                aria-describedby={`product-${key}-hint`}
              />
              <small id={`product-${key}-hint`} className="muted">
                Uma opção por linha, até 30. Todas usam o mesmo preço.
              </small>
            </div>
          ))}
        </div>
        <div className="field">
          <Label htmlFor="product-specifications">
            Especificações do produto
          </Label>
          <Textarea
            id="product-specifications"
            value={value.specifications ?? ""}
            maxLength={3000}
            onChange={(e) =>
              onChange({ ...value, specifications: e.target.value })
            }
            placeholder="Material, medidas, cuidados e informações de uso"
          />
        </div>
      </section>
    </Card>
  );
}
