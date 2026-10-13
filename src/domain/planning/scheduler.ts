import type {
  PlanningInput,
  Forecast,
  BatchDTO,
  BatchForecast,
  Interval,
} from "./types";
import {
  expandCalendar,
  durationMs,
  intersectIntervals,
  findContinuousSlot,
  civilInstant,
} from "./calendar";
const iso = (ms: number) => new Date(ms).toISOString();
const interval = (s: number, e: number): Interval => ({
  start: iso(s),
  end: iso(e),
});
export function effectiveMilestones(batch: BatchDTO) {
  const replaced = new Set(
    batch.milestones.flatMap((m) => (m.sourceId ? [m.sourceId] : [])),
  );
  return batch.milestones.filter((m) => !replaced.has(m.id));
}
export function forecast(input: PlanningInput): Forecast {
  const now = Date.parse(input.asOf),
    horizon = now + 90 * 86400000;
  const team = input.team
    ? expandCalendar(input.team, input.asOf, iso(horizon))
    : [];
  const result: Forecast = {
    asOf: input.asOf,
    revision: input.revision,
    batches: [],
    totals: [],
  };
  type Job = {
    batch: BatchDTO;
    out: BatchForecast;
    stage: "PREPARE" | "REMOVE";
    ready: number;
    actualService: boolean;
  };
  const queues = new Map<string, Job[]>(),
    windows = new Map<string, Interval[]>();
  let teamTime = now,
    teamUnknown = false;
  for (const machine of input.machines) {
    const available = machine.calendar
      ? expandCalendar(machine.calendar, input.asOf, iso(horizon))
      : [];
    windows.set(machine.id, available);
    result.totals.push({
      printerId: machine.id,
      availableMinutes: available.reduce(
        (n, w) => n + (Date.parse(w.end) - Date.parse(w.start)) / 60000,
        0,
      ),
      printMinutes: 0,
      serviceMinutes: 0,
      waitingMinutes: 0,
    });
    const jobs: Job[] = [];
    let blocked: BatchForecast["reason"] = null;
    const batches = [...machine.batches]
      .filter((b) => !["DRAFT", "CANCELED", "CLOSED"].includes(b.state))
      .sort((a, b) => {
        const active = (x: BatchDTO) =>
          ["PREPARING", "PRINTING", "AWAITING_REMOVAL"].includes(x.state)
            ? 0
            : 1;
        return (
          active(a) - active(b) ||
          a.position - b.position ||
          a.id.localeCompare(b.id)
        );
      });
    for (const batch of batches) {
      const dueDate =
        batch.participants
          .map((p) => p.dueDate)
          .filter((x): x is string => !!x)
          .sort()[0] ?? null;
      const out: BatchForecast = {
        batchId: batch.id,
        printerId: machine.id,
        prepare: null,
        print: null,
        removal: null,
        waitingRemoval: null,
        dueDate,
        late: false,
        reason: null,
      };
      result.batches.push(out);
      if (batch.state === "PENDING") {
        out.reason = "MATERIAL_PENDING";
        continue;
      }
      if (blocked) {
        out.reason = blocked;
        continue;
      }
      if (!machine.calendar || !input.team) {
        out.reason = blocked = "MISSING_DATA";
        continue;
      }
      if (
        batch.state === "SCHEDULED" &&
        (batch.blockers.length ||
          !batch.durationConfirmedAt ||
          !batch.durationMinutes)
      ) {
        out.reason = "MISSING_DATA";
        continue;
      }
      const events = effectiveMilestones(batch),
        at = (kind: string) => {
          const m = events.find((x) => x.kind === kind);
          return m ? Date.parse(m.instant) : null;
        };
      const job: Job = {
        batch,
        out,
        stage: "PREPARE",
        ready: now,
        actualService: false,
      };
      if (batch.state === "PRINTING") {
        const start = at("PRINT_START");
        const end =
          batch.remainingMinutes !== null && batch.remainingAsOf
            ? Date.parse(batch.remainingAsOf) +
              durationMs(batch.remainingMinutes)
            : (start ?? now) + durationMs(batch.durationMinutes ?? "0");
        if (start === null || end <= now) {
          out.reason = blocked = "UNCONFIRMED_END";
          continue;
        }
        out.print = interval(start, end);
        job.stage = "REMOVE";
        job.ready = end;
      } else if (batch.state === "AWAITING_REMOVAL") {
        const end = at("PRINT_END") ?? at("INTERRUPT");
        if (end === null) {
          out.reason = blocked = "MISSING_DATA";
          continue;
        }
        const start = at("PRINT_START");
        if (start !== null) out.print = interval(start, end);
        job.stage = "REMOVE";
        job.ready = Math.max(now, end);
        const removalStart = at("REMOVE_START");
        if (removalStart !== null) {
          const finish = removalStart + durationMs(batch.removeMinutes);
          if (finish <= now) {
            out.reason = blocked = "UNCONFIRMED_END";
            teamUnknown = true;
            continue;
          }
          out.removal = interval(removalStart, finish);
          job.ready = finish;
          job.actualService = true;
          teamTime = Math.max(teamTime, finish);
        }
      } else if (batch.state === "PREPARING") {
        const start = at("PREPARE_START"),
          end = (start ?? now) + durationMs(batch.prepareMinutes);
        if (start === null || end <= now) {
          out.reason = blocked = "UNCONFIRMED_END";
          teamUnknown = true;
          continue;
        }
        out.prepare = interval(start, end);
        out.print = interval(
          end,
          end + durationMs(batch.durationMinutes ?? "0"),
        );
        job.stage = "REMOVE";
        job.ready = Date.parse(out.print.end);
        teamTime = Math.max(teamTime, end);
      }
      jobs.push(job);
    }
    queues.set(machine.id, jobs);
  }
  if (teamUnknown) {
    for (const jobs of queues.values())
      for (const j of jobs) j.out.reason = "UNCONFIRMED_END";
    return result;
  }
  const machineReady = new Map<string, number>();
  while ([...queues.values()].some((q) => q.length)) {
    const candidates: { job: Job; printerId: string; slot: Interval }[] = [];
    for (const [printerId, queue] of queues) {
      const job = queue[0];
      if (!job) continue;
      if (job.actualService) {
        machineReady.set(printerId, job.ready);
        queue.shift();
        continue;
      }
      const available = windows.get(printerId)!;
      const after = Math.max(
        job.ready,
        machineReady.get(printerId) ?? now,
        teamTime,
      );
      let slot: Interval | null = null;
      if (job.stage === "REMOVE")
        slot = findContinuousSlot(
          intersectIntervals(available, team),
          iso(after),
          job.batch.removeMinutes,
        );
      else {
        // Preparation must lead directly into a continuous print in the same machine window.
        const printMs = durationMs(job.batch.durationMinutes ?? "0"),
          prepMs = durationMs(job.batch.prepareMinutes);
        for (const w of intersectIntervals(available, team)) {
          const start = Math.max(after, Date.parse(w.start)),
            end = start + prepMs;
          if (end > Date.parse(w.end)) continue;
          if (
            available.some(
              (m) =>
                Date.parse(m.start) <= start &&
                Date.parse(m.end) >= end + printMs,
            )
          ) {
            slot = interval(start, end);
            break;
          }
        }
      }
      if (!slot) {
        for (const j of queue) j.out.reason = "NO_WINDOW";
        queue.length = 0;
        continue;
      }
      candidates.push({ job, printerId, slot });
    }
    candidates.sort(
      (a, b) =>
        Date.parse(a.slot.start) - Date.parse(b.slot.start) ||
        (a.job.out.dueDate ?? "9999").localeCompare(
          b.job.out.dueDate ?? "9999",
        ) ||
        (a.job.stage === "REMOVE" ? 0 : 1) -
          (b.job.stage === "REMOVE" ? 0 : 1) ||
        a.job.batch.id.localeCompare(b.job.batch.id),
    );
    const candidate = candidates[0];
    if (!candidate) continue;
    const { job, printerId, slot } = candidate;
    teamTime = Date.parse(slot.end);
    if (job.stage === "PREPARE") {
      job.out.prepare = slot;
      const end = teamTime + durationMs(job.batch.durationMinutes!);
      job.out.print = interval(teamTime, end);
      job.stage = "REMOVE";
      job.ready = end;
    } else {
      job.out.removal = slot;
      const printEnd = job.out.print
        ? Date.parse(job.out.print.end)
        : job.ready;
      job.out.waitingRemoval = interval(printEnd, Date.parse(slot.start));
      if (job.out.dueDate)
        job.out.late =
          Date.parse(slot.end) > civilInstant(job.out.dueDate, 1440);
      machineReady.set(printerId, teamTime);
      queues.get(printerId)!.shift();
    }
  }
  const length = (w: Interval | null) =>
    w
      ? Math.max(
          0,
          Math.min(horizon, Date.parse(w.end)) -
            Math.max(now, Date.parse(w.start)),
        ) / 60000
      : 0;
  for (const out of result.batches) {
    const total = result.totals.find((t) => t.printerId === out.printerId)!;
    total.printMinutes += length(out.print);
    total.serviceMinutes += length(out.prepare) + length(out.removal);
    total.waitingMinutes += length(out.waitingRemoval);
  }
  return result;
}
