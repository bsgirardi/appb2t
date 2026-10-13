import type { Candidate, Suggestion } from "./types";
export function suggestBatches(candidates: Candidate[]): Suggestion[] {
  const groups = new Map<string, Suggestion>();
  const sorted = [...candidates].sort(
    (a, b) =>
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
      a.orderSequence - b.orderSequence ||
      a.lineId.localeCompare(b.lineId),
  );
  for (const c of sorted) {
    if (!c.printerId || !c.materialItemId || !c.colorKey || c.units <= 0)
      continue;
    const key = JSON.stringify([
      c.printerId,
      c.technology,
      c.materialItemId,
      c.colorKey,
    ]);
    const group = groups.get(key) ?? {
      printerId: c.printerId,
      materialItemId: c.materialItemId,
      colorKey: c.colorKey,
      candidates: [],
    };
    group.candidates.push(c);
    groups.set(key, group);
  }
  return [...groups.values()];
}
