import type {
  PricingRequest,
  PricingV2Input,
  PricingV2Result,
  Ref,
} from "../types";
export type ComparisonReference =
  { kind: "CHANNEL" } | { kind: "COMMON"; unitPrice: string };
export type ComparisonAlternative = {
  channelRef: Ref;
  discountPercent: string;
};
export type ComparisonDraft = {
  name: string;
  request: PricingRequest;
  reference: ComparisonReference;
  alternatives: ComparisonAlternative[];
};
export type ComparisonMetrics = {
  coverageUnitPrice: string;
  targetUnitPrice: string | null;
  requiredUnitPrice: string | null;
  targetUnavailableReason: string | null;
  coversFullCost: boolean;
  meetsTarget: boolean;
  referenceUnitPrice: string;
  finalUnitPrice: string;
  discountAmount: string;
  contributionChange: string;
  marginChangePoints: string | null;
};
export type CalculatedAlternative = ComparisonAlternative & {
  input: PricingV2Input;
  result: PricingV2Result;
  metrics: ComparisonMetrics;
};
export type ComparisonPreview = {
  alternatives: (
    | { status: "VALID"; value: CalculatedAlternative }
    | {
        status: "INVALID";
        channelRef: Ref;
        discountPercent: string;
        message: string;
      }
  )[];
};
export type SavedComparison = {
  id: string;
  name: string;
  createdAt: string;
  actorId: string;
  actorName: string;
  contractVersion: 1;
  calculationVersion: 1;
  reference: ComparisonReference;
  originalMode: PricingV2Input["mode"];
  settingsVersion: number;
  alternatives: (CalculatedAlternative & {
    id: string;
    position: number;
    snapshotId: string;
  })[];
};
export type SavedComparisonSummary = Pick<
  SavedComparison,
  "id" | "name" | "createdAt" | "actorName"
> & { quantity: number; count: number };
export type ComparisonPage = {
  items: SavedComparisonSummary[];
  nextCursor: string | null;
};
