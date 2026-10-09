import type { DocumentTotals, SaleStatus } from "@/domain/commerce/types";
export type Money = string;
export type Coverage = "UNAVAILABLE" | "PARTIAL" | "PROVISIONAL" | "COMPLETE";
export type DeclaredAmount =
  { state: "UNKNOWN" } | { state: "DECLARED"; value: Money };
export type Metric = {
  value: Money | null;
  knownValue: Money;
  coverage: Coverage;
  reasons: string[];
};
export type AllocationWeight = {
  key: string;
  position: number;
  weight: string;
};
export type Allocation = { key: string; value: Money };
export type CostSource = {
  id: string;
  label: string;
  value: Money | null;
  kind: string;
};
export type ExtraConfirmation = { lineKey: string; extraKey: string } & (
  | { kind: "U3_SOURCE"; sourceId: string; value: Money }
  | { kind: "COMPLEMENT"; complementId: string }
  | { kind: "NOT_OCCURRED"; reason: string }
);
export type AdministrativePayload = {
  channel: { id: string; version: number; name: string } | null;
  expectedShipping: DeclaredAmount;
  fees: DeclaredAmount;
  shipping: DeclaredAmount;
  extras: {
    id: string;
    lineKey: string;
    reference: string;
    description: string;
    value: Money;
    effectiveDate: string;
    notInProduction: true;
  }[];
  confirmations: ExtraConfirmation[];
  lineReviews: { lineKey: string; sourceHash: string; complete: boolean }[];
  commercialPending: boolean;
  commercialReason: string;
};
export type RevisionInput = {
  saleId: string;
  expectedVersion: number;
  operationKey: string;
  effectiveDate: string;
  reason: string;
  payload: AdministrativePayload;
};
export type RevisionDTO = {
  id: string;
  saleId: string;
  version: number;
  predecessorId: string | null;
  actorId: string;
  createdAt: string;
  effectiveDate: string;
  reason: string;
  payload: AdministrativePayload;
};
export type ExpectedCost = {
  snapshotId: string;
  variable: Money;
  depreciation: Money;
  fixedFees: Money;
  feePercent: string;
  extras: { key: string; name: string; value: Money }[];
  suggestedRevenue: Money;
};
export type ProfitabilityLineInput = {
  key: string;
  position: number;
  productId: string | null;
  description: string;
  quantity: number;
  grossRevenue: Money;
  expected: ExpectedCost | null;
  expectedMissing?: string[];
  actual: {
    total: Money | null;
    knownTotal: Money;
    components: Record<string, Money> | null;
    reservedTotal: Money | null;
    delivered: number;
    provisional: boolean;
    missing: string[];
    sources: CostSource[];
  };
  sourceHash: string;
};
export type SaleProfitabilityInput = {
  saleId: string;
  number: string;
  version: number;
  status: SaleStatus;
  confirmedAt: string | null;
  readAt: string;
  factsHash: string;
  totals: DocumentTotals;
  lines: ProfitabilityLineInput[];
  administrative: AdministrativePayload | null;
  revision?: RevisionDTO | null;
  received?: Money;
  pending?: Money;
};
export type Scenario = {
  productive: Metric;
  depreciation: Metric;
  totalCost: Metric;
  fees: Metric;
  shipping: Metric;
  contribution: Metric;
  afterDepreciation: Metric;
  margin: Metric;
};
export type ProfitabilityLineDTO = ProfitabilityLineInput & {
  revenue: Money;
  netProducts: Money;
  expectedScenario: Scenario;
  actualScenario: Scenario;
};
export type SaleProfitabilityDTO = Omit<SaleProfitabilityInput, "lines"> & {
  lines: ProfitabilityLineDTO[];
  revenue: Money;
  expected: Scenario;
  actual: Scenario;
  compositionMissing: boolean;
  excluded: boolean;
};
export type ReportFilter = {
  from?: string;
  to?: string;
  undated: boolean;
  situation: "NORMAL" | "EXCEPTIONS";
  productId?: string;
  channelId?: string;
  coverage?: Coverage;
  page: number;
  pageSize: number;
};
export type SummaryMetric = {
  value: Money | null;
  coveredRevenue: Money;
  count: number;
  margin: Money | null;
};
export type Summary = {
  count: number;
  revenue: Money;
  expected: SummaryMetric;
  actual: SummaryMetric;
  afterDepreciation: SummaryMetric;
  contributionChange: SummaryMetric;
  costChange: SummaryMetric;
  knownCost: Money;
};
export type ReportDTO = {
  summary: Summary;
  products: { id: string; name: string; summary: Summary }[];
  channels: { id: string; name: string; summary: Summary }[];
  items: SaleProfitabilityDTO[];
  total: number;
  page: number;
  pageSize: number;
};
export type AssessmentDTO = {
  id: string;
  saleId: string;
  engineVersion: string;
  factsHash: string;
  input: SaleProfitabilityInput;
  result: SaleProfitabilityDTO;
  actorId: string;
  createdAt: string;
};
