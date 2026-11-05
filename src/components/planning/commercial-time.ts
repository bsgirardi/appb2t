import { civilDay, civilInstant } from "@/domain/planning/calendar";
export function localPlanningTime(iso: string): string {
  if (!iso) return "";
  const d = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
  return `${civilDay(iso)}T${d}`;
}
export function planningInstant(value: string): string {
  if (!value) return "";
  const [date, time] = value.split("T");
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  return new Date(civilInstant(date, h * 60 + m)).toISOString();
}
export function planningLabel(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "Indisponível";
}
