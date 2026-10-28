import { createHash } from "node:crypto";
import type { PlanningInput } from "@/domain/planning/types";
import { simulateQueue, type QueueScenario } from "@/domain/planning/scenario";
import { AppError } from "@/lib/errors";
const byId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id));
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
}
export function planningFingerprint(input: PlanningInput, scenario: QueueScenario): string {
  const calendar = (c: PlanningInput["team"]) => c && ({ ...c,
    weekly: [...c.weekly].sort((a,b) => a.weekday-b.weekday || a.startMinute-b.startMinute || a.endMinute-b.endMinute),
    exceptions: [...c.exceptions].sort((a,b) => a.date.localeCompare(b.date)).map(e => ({ ...e, intervals: [...e.intervals].sort((a,b) => a.startMinute-b.startMinute || a.endMinute-b.endMinute) })),
  });
  return createHash("sha256").update(JSON.stringify(canonical({ scenario: { printerId: scenario.printerId, batchIds: scenario.batchIds }, input: {
    ...input, team: calendar(input.team), machines: byId(input.machines).map(m => ({ ...m, calendar: calendar(m.calendar), batches: byId(m.batches).map(b => ({ ...b,
      participants: byId(b.participants), coverage: byId(b.coverage), milestones: byId(b.milestones), blockers: [...b.blockers].sort(),
      estimates: [...b.estimates].sort((a,b) => a.lineId.localeCompare(b.lineId)),
    })) })),
  } }))).digest("hex");
}
export function assertPreviewCurrent(input: PlanningInput, scenario: QueueScenario, preview: { asOf: string; fingerprint: string }, now: string): void {
  const start = Date.parse(preview.asOf), end = Date.parse(now);
  const fail = () => { throw new AppError("CONFLICT", "A prévia mudou ou expirou. Atualize e simule novamente antes de confirmar."); };
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start >= 60000 || input.asOf !== preview.asOf || planningFingerprint(input, scenario) !== preview.fingerprint) fail();
  const result = simulateQueue(input, scenario);
  for (const batch of [...result.before.batches, ...result.after.batches]) {
    for (const interval of [batch.prepare, batch.print, batch.waitingRemoval, batch.removal]) {
      if (interval && [interval.start, interval.end].some(t => Date.parse(t) > start && Date.parse(t) <= end)) fail();
    }
  }
}
