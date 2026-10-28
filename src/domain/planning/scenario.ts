import type { BatchDTO, BatchForecast, Forecast, PlanningInput } from "./types";
import { forecast } from "./scheduler";
export type QueueScenario = { printerId: string; batchIds: string[] };
export type QueueSimulation = {
  before: Forecast;
  after: Forecast;
  impacts: { batchId: string; printerId: string; before: BatchForecast; after: BatchForecast; participants: BatchDTO["participants"] }[];
};
export type QueuePreview = QueueSimulation & {
  asOf: string; revision: number; expiresAt: string; fingerprint: string;
};
export function validateQueue(input: PlanningInput, scenario: QueueScenario): void {
  const machine = input.machines.find(m => m.id === scenario.printerId);
  const future = machine?.batches.filter(b => ["PENDING", "SCHEDULED"].includes(b.state));
  if (!future || future.length !== scenario.batchIds.length || new Set(scenario.batchIds).size !== future.length || future.some(b => !scenario.batchIds.includes(b.id)))
    throw new RangeError("Informe toda a fila futura uma única vez.");
}
export function simulateQueue(input: PlanningInput, scenario: QueueScenario): QueueSimulation {
  validateQueue(input, scenario);
  const positions = new Map(scenario.batchIds.map((id, i) => [id, i + 1]));
  const afterInput = { ...input, machines: input.machines.map(m => m.id !== scenario.printerId ? m : ({
    ...m, batches: m.batches.map(b => positions.has(b.id) ? { ...b, position: positions.get(b.id)! } : b),
  })) };
  const before = forecast(input), after = forecast(afterInput);
  const original = new Map(before.batches.map(b => [b.batchId, b]));
  const batches = new Map(input.machines.flatMap(m => m.batches).map(b => [b.id, b]));
  return { before, after, impacts: after.batches.flatMap(b => {
    const prev = original.get(b.batchId)!;
    return JSON.stringify(prev) === JSON.stringify(b) ? [] : [{
      batchId: b.batchId, printerId: b.printerId, before: prev, after: b, participants: batches.get(b.batchId)!.participants,
    }];
  }) };
}
