import { AppError } from "@/lib/errors";
export function parseCivilDate(raw: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw))
    throw new AppError("VALIDATION", "Data inválida.");
  const date = new Date(`${raw}T12:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== raw ||
    Number(raw.slice(0, 4)) < 1900
  )
    throw new AppError("VALIDATION", "Data inválida.");
  return raw;
}
export function todaySaoPaulo(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function addMonthsClamped(raw: string, months: number): string {
  parseCivilDate(raw);
  if (!Number.isInteger(months) || months < 0 || months > 120)
    throw new AppError("VALIDATION", "Intervalo de meses inválido.");
  const [year, month, day] = raw.split("-").map(Number),
    end = new Date(Date.UTC(year, month + months, 0));
  const date = new Date(
    Date.UTC(year, month - 1 + months, Math.min(day, end.getUTCDate())),
  )
    .toISOString()
    .slice(0, 10);
  return parseCivilDate(date);
}
export function civilDateToDb(raw: string): Date {
  return new Date(`${parseCivilDate(raw)}T00:00:00Z`);
}
export function civilDateFromDb(date: Date): string {
  return date.toISOString().slice(0, 10);
}
