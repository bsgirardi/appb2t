import { units } from "@/domain/production/quantities";
import { AppError } from "@/lib/errors";
import type { CustodyFact, CustodyBalance } from "./types";
import { parseCivilDate } from "@/domain/commerce/dates";
export function projectDatedCustody(
  events: (CustodyFact & { date: string; sequence: number })[],
): CustodyBalance {
  for (const e of events) parseCivilDate(e.date);
  return projectCustody(
    [...events].sort(
      (a, b) => a.date.localeCompare(b.date) || a.sequence - b.sequence,
    ),
  );
}
export function projectCustody(events: CustodyFact[]): CustodyBalance {
  const state: CustodyBalance = {
    outbound: 0,
    partner: 0,
    inbound: 0,
    sold: 0,
    lost: 0,
  };
  for (const event of events) {
    units(event.units, true);
    if (
      event.from === event.to ||
      (event.from !== null && !(event.from in state)) ||
      (event.to !== null && !(event.to in state))
    )
      throw new AppError("VALIDATION", "Movimento de custódia inválido.");
    if (event.from) state[event.from] -= event.units;
    if (event.to) state[event.to] += event.units;
    for (const value of Object.values(state)) units(value);
  }
  return state;
}
