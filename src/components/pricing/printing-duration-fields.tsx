"use client";

import { useState } from "react";
import Decimal from "decimal.js";
import { Field, FieldGroup } from "@/components/ui/field";

function parts(value: string) {
  try {
    const duration = new Decimal(value);
    return {
      hours: duration.div(60).floor().toFixed(),
      minutes: duration.mod(60).toFixed(),
    };
  } catch {
    return { hours: "0", minutes: "0" };
  }
}

/** Only converts display units; the V2 engine still validates and calculates costs. */
export function PrintingDurationFields({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (minutes: string) => void;
  error?: string;
}) {
  const [duration, setDuration] = useState(() => parts(value));
  const validHours =
    /^\d+$/.test(duration.hours) && Number(duration.hours) <= 100000;
  const validMinutes =
    /^\d+([.,]\d{1,6})?$/.test(duration.minutes) &&
    Number(duration.minutes.replace(",", ".")) < 60;
  function update(next: typeof duration) {
    setDuration(next);
    if (
      !/^\d+$/.test(next.hours) ||
      Number(next.hours) > 100000 ||
      !/^\d+([.,]\d{1,6})?$/.test(next.minutes) ||
      Number(next.minutes.replace(",", ".")) >= 60
    ) {
      onChange("");
      return;
    }
    onChange(
      new Decimal(next.hours)
        .times(60)
        .plus(next.minutes.replace(",", "."))
        .toFixed(),
    );
  }
  return (
    <FieldGroup className="grid gap-4 sm:grid-cols-2">
      <Field
        required
        label="Horas de impressão do lote"
        inputMode="numeric"
        value={duration.hours}
        error={
          !validHours ? "Informe horas inteiras entre 0 e 100.000." : error
        }
        onChange={(e) => update({ ...duration, hours: e.target.value })}
      />
      <Field
        required
        label="Minutos de impressão do lote"
        inputMode="decimal"
        value={duration.minutes}
        error={
          !validMinutes ? "Informe minutos entre 0 e menos de 60." : undefined
        }
        onChange={(e) => update({ ...duration, minutes: e.target.value })}
      />
    </FieldGroup>
  );
}
