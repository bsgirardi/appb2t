"use client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { formatBRL } from "@/domain/calculation/calculate";
import type {
  ProductConfiguration,
  ConfigurationAnswer,
} from "@/domain/products/configuration";
export function ProductConfigurationFields({
  configuration,
  answers,
  errors,
  onChange,
}: {
  configuration: ProductConfiguration;
  answers: ConfigurationAnswer[];
  errors: Record<string, string>;
  onChange: (answers: ConfigurationAnswer[], fieldId: string) => void;
}) {
  return (
    <div className="store-configuration-fields">
      {configuration.fields.map((field) => {
        const value = answers.find((a) => a.fieldId === field.id)?.value ?? "";
        const id = `configuration-${field.id}`;
        const change = (value: string) =>
          onChange(
            [
              ...answers.filter((a) => a.fieldId !== field.id),
              { fieldId: field.id, value },
            ],
            field.id,
          );
        const props = {
          id,
          value,
          "aria-invalid": !!errors[field.id],
          "aria-describedby": `${id}-help ${id}-error`,
        };
        return (
          <div
            className="field"
            data-invalid={!!errors[field.id]}
            key={field.id}
          >
            <Label htmlFor={id}>
              {field.label}
              {field.required ? " *" : " (opcional)"}
            </Label>
            {field.type === "SINGLE_CHOICE" ? (
              <NativeSelect {...props} onChange={(e) => change(e.target.value)}>
                <option value="">Selecione</option>
                {field.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                    {o.effect.kind === "ADD"
                      ? ` (+ ${formatBRL(o.effect.amount)}/un.)`
                      : o.effect.kind === "CONSULT"
                        ? " — sob consulta"
                        : ""}
                  </option>
                ))}
              </NativeSelect>
            ) : field.type === "LONG_TEXT" ? (
              <Textarea
                {...props}
                rows={3}
                onChange={(e) => change(e.target.value)}
              />
            ) : (
              <Input {...props} onChange={(e) => change(e.target.value)} />
            )}
            <small id={`${id}-help`}>
              {field.help}
              {field.type !== "SINGLE_CHOICE" &&
                ` ${[...value.normalize("NFC").trim()].length}/${field.maxLength} caracteres`}
              {field.type !== "SINGLE_CHOICE" &&
                field.effect.kind === "ADD" &&
                ` · + ${formatBRL(field.effect.amount)}/un. quando preenchido`}
              {field.type !== "SINGLE_CHOICE" &&
                field.effect.kind === "CONSULT" &&
                " · Valor depende de análise quando preenchido"}
            </small>
            <span
              id={`${id}-error`}
              className="store-field-error"
              role={errors[field.id] ? "alert" : undefined}
            >
              {errors[field.id]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
