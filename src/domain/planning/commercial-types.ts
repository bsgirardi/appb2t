import type { BatchDTO, BatchForecast, Forecast } from "./types";
import type { PlanningIssue } from "./issues";
export type { PlanningIssue } from "./issues";
export type DemandLineFacts = {
  lineKey: string;
  description: string;
  soldUnits: number;
  deliveredUnits: number;
  committedUnits: number;
  uncommittedGoodUnits: number;
  production: { lineId: string; remaining: number }[];
  issues: PlanningIssue[];
};
export type DemandFacts = {
  saleId: string;
  mode: string;
  status: string;
  lines: DemandLineFacts[];
  issues: PlanningIssue[];
};
export type DemandProjection = {
  lines: {
    lineKey: string;
    description: string;
    delivered: number;
    readyCommitted: number;
    planned: number;
    uncovered: number;
    removalAt: string | null;
    issues: PlanningIssue[];
  }[];
  completeCoverage: boolean;
  removalAt: string | null;
  allDelivered: boolean;
  issues: PlanningIssue[];
};
export type CompletionAssumptions = {
  post:
    | { mode: "unknown" }
    | { mode: "waived"; reason: string }
    | { mode: "declared"; at: string; reason: string };
  delivery:
    | { mode: "unknown" }
    | { mode: "pickup"; at: string; reason: string }
    | { mode: "shipping"; at: string; reason: string; source: string };
};
export type CompletionProjection = {
  removalAt: string | null;
  releaseAt: string | null;
  deliveryAt: string | null;
  issues: string[];
};
export type CommercialQuoteLine = {
  lineKey: string;
  description: string;
  quantity: number;
  technology: string | null;
  suggestion?: {
    printerId: string;
    minutes: string;
    snapshotId: string;
    sourceQuantity: number;
  } | null;
};
export type HypotheticalBatch = {
  id: string;
  lineKey: string;
  printerId: string;
  technology?: "FDM" | "RESIN";
  units: number;
  durationMinutes: string;
  prepareMinutes: string;
  removeMinutes: string;
  materialItemId: string;
  colorLabel: string;
  availableAt: string;
  availabilityReason: string;
  durationSource: "snapshot" | "manual";
  reviewed: boolean;
  profileAssumed: boolean;
  fitAssumed: boolean;
};
export type HypotheticalLine =
  | {
      lineKey: string;
      quantity: number;
      mode: "produce";
      batches: HypotheticalBatch[];
    }
  | {
      lineKey: string;
      quantity: number;
      mode: "external";
      availableAt: string;
      reason: string;
    };
export type CommercialScenario = {
  lines: HypotheticalLine[];
  completion: CompletionAssumptions;
};
export type CommercialSimulation = {
  before: Forecast;
  after: Forecast;
  lines: { lineKey: string; removalAt: string | null }[];
  removalAt: string | null;
  impacts: {
    batchId: string;
    before: BatchForecast;
    after: BatchForecast;
    participants: BatchDTO["participants"];
    sales?: { id: string; sequence: number }[];
  }[];
  issues: string[];
  warnings: string[];
  completion: CompletionProjection;
};
export type CommercialEnvelope<T> = {
  asOf: string;
  expiresAt: string;
  revision: number;
  source: {
    kind: "quote" | "sale";
    id: string;
    version: number;
    fingerprint: string;
  };
  result: T;
};
export const unknownCompletion: CompletionAssumptions = {
  post: { mode: "unknown" },
  delivery: { mode: "unknown" },
};
export function demandIssue(
  code: string,
  id: string,
  message: string,
  nextAction: string,
): PlanningIssue {
  return {
    code,
    message,
    entity: { kind: "sale", id },
    nextAction,
    resolution:
      "Cobertura e vínculos reconciliados para toda a quantidade vendida.",
    target: { kind: "sale", id },
  };
}
