"use client";
import { Card } from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
import type {
  CalculationInput,
  PrinterValues,
  SettingsValues,
} from "@/domain/calculation/types";
const printerFields: [keyof PrinterValues, string, string][] = [
  ["acquisitionCost", "Valor de aquisição", "R$"],
  ["amortizationMonths", "Meses de amortização", "meses"],
  ["daysPerMonth", "Dias de uso por mês", "dias"],
  ["hoursPerDay", "Horas de uso por dia", "h"],
  ["watts", "Potência", "W"],
];
const settingsFields: [keyof SettingsValues, string, string][] = [
  ["energyRate", "Tarifa de energia", "R$/kWh"],
  ["maintenancePercent", "Manutenção", "%"],
  ["failurePercent", "Provisão para falhas", "%"],
  ["finishingPercent", "Acabamento", "%"],
  ["fixation", "Fixação", "R$"],
  ["markupPercent", "Acréscimo sobre o custo", "%"],
];
export function ProductCalculationFields({
  value,
  onChange,
  errors = {},
}: {
  value: CalculationInput;
  errors?: Record<string, string>;
  onChange: (value: CalculationInput) => void;
}) {
  const integer = (raw: string) => (/^\d+$/.test(raw) ? Number(raw) : NaN);
  const displayed = (number: number) =>
    Number.isFinite(number) ? String(number) : "";
  return (
    <>
      <Card asChild>
        <section className="">
          <h2>Dados da produção · obrigatórios</h2>
          <p className="admin-form-note">
            Use o consumo e o tempo total do fatiador para uma peça. Para 30
            minutos, informe 0 horas e 30 minutos. O tempo total precisa ser
            maior que zero.
          </p>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field
              required
              error={errors["calculation.consumption"]}
              label="Consumo de material"
              value={value.consumption}
              inputMode="decimal"
              suffix={value.technology === "FDM" ? "g" : "ml"}
              onChange={(e) =>
                onChange({ ...value, consumption: e.target.value })
              }
            />
            <Field
              required
              error={errors["calculation.materialPrice"]}
              label="Preço do material"
              value={value.materialPrice}
              inputMode="decimal"
              suffix={value.technology === "FDM" ? "R$/kg" : "R$/litro"}
              onChange={(e) =>
                onChange({ ...value, materialPrice: e.target.value })
              }
            />
            <Field
              required
              error={errors["calculation.hours"]}
              label="Horas"
              value={displayed(value.hours)}
              inputMode="numeric"
              suffix="h"
              onChange={(e) =>
                onChange({ ...value, hours: integer(e.target.value) })
              }
            />
            <Field
              required
              error={errors["calculation.minutes"]}
              label="Minutos"
              value={displayed(value.minutes)}
              inputMode="numeric"
              suffix="min"
              onChange={(e) =>
                onChange({ ...value, minutes: integer(e.target.value) })
              }
            />
          </FieldGroup>
        </section>
      </Card>
      <Card asChild>
        <section className="">
          <h2>Custos da impressora</h2>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {printerFields.map(([key, label, suffix]) => {
              const isInteger =
                key === "amortizationMonths" || key === "daysPerMonth";
              return (
                <Field
                  key={key}
                  required
                  error={errors[`calculation.printer.${key}`]}
                  label={label}
                  suffix={suffix}
                  inputMode={isInteger ? "numeric" : "decimal"}
                  value={
                    typeof value.printer[key] === "number"
                      ? displayed(value.printer[key] as number)
                      : value.printer[key]
                  }
                  onChange={(e) =>
                    onChange({
                      ...value,
                      printer: {
                        ...value.printer,
                        [key]: isInteger
                          ? integer(e.target.value)
                          : e.target.value,
                      },
                    })
                  }
                />
              );
            })}
          </FieldGroup>
        </section>
      </Card>
      <Card asChild>
        <section className="">
          <h2>Custos e acréscimo</h2>
          <p className="muted">
            Estes ajustes valem somente para este produto.
          </p>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {settingsFields.map(([key, label, suffix]) => (
              <Field
                key={key}
                required
                error={errors[`calculation.settings.${key}`]}
                label={label}
                suffix={suffix}
                inputMode="decimal"
                value={value.settings[key]}
                onChange={(e) =>
                  onChange({
                    ...value,
                    settings: { ...value.settings, [key]: e.target.value },
                  })
                }
              />
            ))}
          </FieldGroup>
        </section>
      </Card>
    </>
  );
}
