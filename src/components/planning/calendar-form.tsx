"use client";
import { useState } from "react";
import { Field, Notice } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { planningCommand } from "@/lib/planning-client";
import { ActionForm, text, decimal, meta, type PlanningData } from "./shared";
const days = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];
const clock = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
const show = (xs: { startMinute: number; endMinute: number }[]) =>
  xs.map((x) => `${clock(x.startMinute)}-${clock(x.endMinute)}`).join(", ");
function windows(value: string) {
  if (!value.trim()) return [];
  return value.split(",").map((part) => {
    const match = part.trim().match(/^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/);
    if (!match || +match[2] > 59 || +match[4] > 59)
      throw new Error("Use horários como 08:00-12:00, 13:00-18:00.");
    return {
      startMinute: +match[1] * 60 + +match[2],
      endMinute: +match[3] * 60 + +match[4],
    };
  });
}
function ResourceCalendar({
  data,
  id,
  onDone,
}: {
  data: PlanningData;
  id: string;
  onDone: () => void;
}) {
  const calendar = data.calendars.find((c) => c.id === id);
  const [exceptions, setExceptions] = useState(
    calendar?.exceptions.map((e, i) => ({ ...e, key: i })) ?? [],
  );
  const printerId = id === "TEAM" ? null : id.slice(8);
  const settings = data.printers.find((p) => p.id === printerId)?.settings;
  return (
    <div className="flex flex-col gap-4">
      <ActionForm
        title="Horários de disponibilidade"
        revision={`${data.revision}:${calendar?.version ?? 0}`}
        submit="Salvar horários"
        onDone={onDone}
        onSubmit={(f, key) =>
          planningCommand("CALENDAR_SAVE", {
            ...meta(data, key, calendar?.version),
            resource: printerId ? "PRINTER" : "TEAM",
            printerId,
            weekly: days.flatMap((_, i) =>
              windows(text(f, `day${i}`)).map((w) => ({
                weekday: i + 1,
                ...w,
              })),
            ),
            exceptions: exceptions.map((e) => ({
              date: text(f, `date${e.key}`),
              intervals: windows(text(f, `exception${e.key}`)),
            })),
          })
        }
      >
        <Notice kind="info">
          Horário de São Paulo. Vazio significa fechado. Separe turnos por
          vírgula. Para atravessar a meia-noite, termine em 24:00 e continue em
          00:00 no dia seguinte. Uma exceção substitui o dia inteiro.
        </Notice>
        {days.map((day, i) => (
          <Field
            key={day}
            label={day}
            name={`day${i}`}
            defaultValue={show(
              calendar?.weekly.filter((w) => w.weekday === i + 1) ?? [],
            )}
            placeholder="08:00-12:00, 13:00-18:00"
          />
        ))}
        <fieldset className="flex flex-col gap-3">
          <legend>Exceções e manutenção</legend>
          {exceptions.map((e) => (
            <div key={e.key} className="grid gap-2 sm:grid-cols-3">
              <Field
                label="Data da exceção"
                name={`date${e.key}`}
                type="date"
                required
                defaultValue={e.date}
              />
              <Field
                label="Horários da exceção"
                name={`exception${e.key}`}
                defaultValue={show(e.intervals)}
                hint="Vazio fecha este dia."
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setExceptions((xs) => xs.filter((x) => x.key !== e.key))
                }
              >
                Excluir exceção
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setExceptions((xs) => [
                ...xs,
                {
                  key: Math.max(-1, ...xs.map((x) => x.key)) + 1,
                  date: "",
                  intervals: [],
                },
              ])
            }
          >
            Adicionar exceção
          </Button>
        </fieldset>
      </ActionForm>
      {printerId && (
        <ActionForm
          title="Tempos padrão da máquina"
          revision={`${data.revision}:${settings?.version ?? 0}`}
          onDone={onDone}
          onSubmit={(f, key) =>
            planningCommand("MACHINE_SETTINGS", {
              ...meta(data, key, settings?.version),
              printerId,
              prepareMinutes: decimal(f, "prepareMinutes"),
              removeMinutes: decimal(f, "removeMinutes"),
            })
          }
        >
          <Field
            label="Preparação padrão (min)"
            name="prepareMinutes"
            required
            defaultValue={settings?.prepareMinutes}
          />
          <Field
            label="Retirada padrão (min)"
            name="removeMinutes"
            required
            defaultValue={settings?.removeMinutes}
          />
          <p>Aplicados a novos lotes; cada lote permite ajuste próprio.</p>
        </ActionForm>
      )}
    </div>
  );
}
export function CalendarForm({
  data,
  onDone,
}: {
  data: PlanningData;
  onDone: () => void;
}) {
  const [id, setId] = useState("TEAM");
  return (
    <section className="flex flex-col gap-3">
      <label className="field">
        Configurar horários de
        <NativeSelect value={id} onChange={(e) => setId(e.target.value)}>
          <option value="TEAM">Equipe (uma pessoa)</option>
          {data.printers
            .filter((p) => p.active)
            .map((p) => (
              <option value={`PRINTER:${p.id}`} key={p.id}>
                {p.name}
              </option>
            ))}
        </NativeSelect>
      </label>
      <ResourceCalendar key={id} data={data} id={id} onDone={onDone} />
    </section>
  );
}
