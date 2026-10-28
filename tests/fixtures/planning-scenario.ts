import type { BatchDTO, CalendarDTO, PlanningInput } from "@/domain/planning/types";
export const asOf = "2026-10-27T11:00:00.000Z";
export const fullCalendar = (): CalendarDTO => ({
  id: "c", version: 1,
  weekly: Array.from({ length: 7 }, (_, i) => ({ weekday: i + 1, startMinute: 0, endMinute: 1440 })),
  exceptions: [],
});
export function scenarioBatch(id: string, overrides: Partial<BatchDTO> = {}): BatchDTO {
  return {
    id, version: 1, sequence: Number(id.charCodeAt(0)), printerId: "p", state: "SCHEDULED", position: 1,
    estimates: [], materialItemId: "m", colorLabel: "Azul", colorKey: "azul", profileConfirmed: true,
    fitConfirmed: true, colorAvailabilityConfirmed: true, durationMinutes: "60", durationConfirmedAt: asOf,
    prepareMinutes: "10", removeMinutes: "10", remainingMinutes: null, remainingAsOf: null,
    participants: [{ id: `part-${id}`, lineId: `line-${id}`, units: 2, settledUnits: 0, releasedUnits: 0,
      needQuantity: "20", dueDate: "2026-10-27", responsibleId: null, description: `Peça ${id}`, orderSequence: id.charCodeAt(0) }],
    coverage: [], milestones: [], blockers: [], ...overrides,
  };
}
export function scenarioInput(): PlanningInput {
  return { asOf, revision: 4, team: fullCalendar(), machines: [
    { id: "p", calendar: fullCalendar(), batches: [scenarioBatch("a", { durationMinutes: "120" }), scenarioBatch("b", { position: 2 })] },
    { id: "q", calendar: fullCalendar(), batches: [scenarioBatch("c", { printerId: "q", durationMinutes: "55" })] },
  ] };
}
