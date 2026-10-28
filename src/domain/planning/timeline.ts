import type { Forecast, Interval } from "./types";
import { civilDay, civilInstant } from "./calendar";
const day = 86400000;
export type TimelineSegment = { batchId: string; printerId: string; kind: "prepare" | "print" | "waitingRemoval" | "removal"; original: Interval; visible: Interval };
export function timelineWindow(asOf: string, week: number): Interval {
  const offset = Math.max(0, Math.min(12, Math.trunc(week)));
  const firstDay = Date.parse(`${civilDay(asOf)}T00:00:00Z`);
  const at = (days: number) => civilInstant(new Date(firstDay + days * day).toISOString().slice(0, 10), 0);
  return { start: new Date(at(offset * 7)).toISOString(), end: new Date(Math.min(at((offset + 1) * 7), Date.parse(asOf) + 90 * day)).toISOString() };
}
export function timelineSegments(forecast: Forecast, window: Interval): TimelineSegment[] {
  const start = Math.max(Date.parse(window.start), Date.parse(forecast.asOf));
  const end = Math.min(Date.parse(window.end), Date.parse(forecast.asOf) + 90 * day);
  return forecast.batches.flatMap(b => (["prepare", "print", "waitingRemoval", "removal"] as const).flatMap(kind => {
    const original = b[kind];
    if (!original) return [];
    const s = Math.max(start, Date.parse(original.start)), e = Math.min(end, Date.parse(original.end));
    return e > s ? [{ batchId: b.batchId, printerId: b.printerId, kind, original, visible: { start: new Date(s).toISOString(), end: new Date(e).toISOString() } }] : [];
  }));
}
