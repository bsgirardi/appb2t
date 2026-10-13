import type { CalendarDTO, Instant, Interval, Minutes } from "./types";
import Decimal from "decimal.js";
const dayMs = 86400000;
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
function parts(ms: number) {
  return Object.fromEntries(
    formatter.formatToParts(new Date(ms)).map((x) => [x.type, x.value]),
  );
}
export function civilDay(instant: Instant): string {
  const p = parts(Date.parse(instant));
  return `${p.year}-${p.month}-${p.day}`;
}
export function civilInstant(date: string, minute: number): number {
  const target = Date.parse(`${date}T00:00:00Z`) + minute * 60000;
  let guess = target;
  for (let i = 0; i < 4; i++) {
    const p = parts(guess);
    const represented = Date.parse(
      `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`,
    );
    const adjustment = target - represented;
    if (!adjustment) return guess;
    guess += adjustment;
  }
  return guess;
}
export function durationMs(minutes: Minutes): number {
  const value = new Decimal(minutes).times(60000).ceil().toNumber();
  return Number.isSafeInteger(value) && value >= 0 ? value : Infinity;
}
export function expandCalendar(
  calendar: CalendarDTO,
  from: Instant,
  to: Instant,
): Interval[] {
  const start = Date.parse(from),
    end = Math.min(Date.parse(to), start + 90 * dayMs);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return [];
  const first = Date.parse(`${civilDay(from)}T00:00:00Z`);
  const ranges: { start: number; end: number }[] = [];
  for (let d = first; d <= end + dayMs; d += dayMs) {
    const date = new Date(d).toISOString().slice(0, 10),
      weekday = new Date(d).getUTCDay() || 7;
    const exception = calendar.exceptions.find((x) => x.date === date);
    const windows = exception
      ? exception.intervals
      : calendar.weekly.filter((x) => x.weekday === weekday);
    for (const w of windows) {
      const s = Math.max(start, civilInstant(date, w.startMinute)),
        e = Math.min(end, civilInstant(date, w.endMinute));
      if (e > s) ranges.push({ start: s, end: e });
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: typeof ranges = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last && range.start <= last.end)
      last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  return merged.map((x) => ({
    start: new Date(x.start).toISOString(),
    end: new Date(x.end).toISOString(),
  }));
}
export function findContinuousSlot(
  intervals: Interval[],
  after: Instant,
  minutes: Minutes,
): Interval | null {
  const length = durationMs(minutes),
    earliest = Date.parse(after);
  for (const i of intervals) {
    const start = Math.max(earliest, Date.parse(i.start));
    if (start + length <= Date.parse(i.end))
      return {
        start: new Date(start).toISOString(),
        end: new Date(start + length).toISOString(),
      };
  }
  return null;
}
export function intersectIntervals(a: Interval[], b: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const x of a)
    for (const y of b) {
      const start = Math.max(Date.parse(x.start), Date.parse(y.start)),
        end = Math.min(Date.parse(x.end), Date.parse(y.end));
      if (start < end)
        result.push({
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        });
    }
  return result.sort((x, y) => Date.parse(x.start) - Date.parse(y.start));
}
