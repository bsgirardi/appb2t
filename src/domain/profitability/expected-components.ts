import { StockDecimal as D } from "@/domain/stock/quantities";
import type { ExpectedProductiveComponents } from "./types";

export function readExpectedComponents(
  result: unknown,
): ExpectedProductiveComponents | undefined {
  if (!result || typeof result !== "object" || Array.isArray(result)) return;
  const row = result as Record<string, unknown>;
  const keys = ["material", "energy", "maintenance", "labor", "extras", "failure"] as const;
  for (const key of keys) {
    const value = row[key];
    if (typeof value !== "string" || !/^\d+(?:\.\d+)?$/.test(value)) return;
    if (!new D(value).isFinite()) return;
  }
  return Object.fromEntries(keys.map(key => [key, row[key]])) as ExpectedProductiveComponents;
}
