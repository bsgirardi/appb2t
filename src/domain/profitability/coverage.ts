import type { Coverage, Metric } from "./types";
export function resolveCoverage(v: {
  hasKnown: boolean;
  missing: string[];
  provisional: boolean;
}): Coverage {
  return v.missing.length
    ? v.hasKnown
      ? "PARTIAL"
      : "UNAVAILABLE"
    : v.provisional
      ? "PROVISIONAL"
      : "COMPLETE";
}
export function metric(
  value: string | null,
  missing: string[] = [],
  provisional = false,
  knownValue = "0",
): Metric {
  const reasons = [...new Set(missing)];
  const coverage = resolveCoverage({
    hasKnown: value !== null || knownValue !== "0",
    missing: reasons,
    provisional,
  });
  return {
    value: coverage === "COMPLETE" ? value : null,
    knownValue: value ?? knownValue,
    coverage,
    reasons,
  };
}
