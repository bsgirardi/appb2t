"use client";
import { Field } from "@/components/ui/field";
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
}: {
  value: CalculationInput;
  onChange: (value: CalculationInput) => void;
}) {
  const integer = (raw: string) => (/^\d+$/.test(raw) ? Number(raw) : NaN);
  const displayed = (number: number) =>
    Number.isFinite(number) ? String(number) : "";
  return (
    <>
      <section className="card">
        <h2>Dados da produção</h2>
        <div className="form-grid">
          <Field
            label="Consumo de material"
            value={value.consumption}
            inputMode="decimal"
            suffix={value.technology === "FDM" ? "g" : "ml"}
            onChange={(e) =>
              onChange({ ...value, consumption: e.target.value })
            }
          />
          <Field
            label="Preço do material"
            value={value.materialPrice}
            inputMode="decimal"
            suffix={value.technology === "FDM" ? "R$/kg" : "R$/litro"}
            onChange={(e) =>
              onChange({ ...value, materialPrice: e.target.value })
            }
          />
          <Field
            label="Horas"
            value={displayed(value.hours)}
            inputMode="numeric"
            suffix="h"
            onChange={(e) =>
              onChange({ ...value, hours: integer(e.target.value) })
            }
          />
          <Field
            label="Minutos"
            value={displayed(value.minutes)}
            inputMode="numeric"
            suffix="min"
            onChange={(e) =>
              onChange({ ...value, minutes: integer(e.target.value) })
            }
          />
        </div>
      </section>
      <section className="card">
        <h2>Custos da impressora</h2>
        <div className="form-grid">
          {printerFields.map(([key, label, suffix]) => {
            const isInteger =
              key === "amortizationMonths" || key === "daysPerMonth";
            return (
              <Field
                key={key}
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
        </div>
      </section>
      <section className="card">
        <h2>Custos e acréscimo</h2>
        <p className="muted">Estes ajustes valem somente para este produto.</p>
        <div className="form-grid">
          {settingsFields.map(([key, label, suffix]) => (
            <Field
              key={key}
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
        </div>
      </section>
    </>
  );
}
