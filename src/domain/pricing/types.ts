import type {
  CalculationInput,
  MaterialDTO,
  PrinterDTO,
  PrinterValues,
  Technology,
} from "@/domain/calculation/types";
export type Ref = { id: string; version: number };
export type PricingMode = "MARKUP" | "CONTRIBUTION" | "INFORMED";
export interface PricingV2Input {
  version: 2;
  tax?: import("@/domain/tax/types").TaxPremise;
  technology: Technology;
  quantity: number;
  materials: {
    ref: Ref;
    name: string;
    unit: "G" | "ML";
    pricePerBase: string;
    consumptionPerUnit: string;
    fixedWaste: string;
  }[];
  printer: PrinterValues & { ref: Ref; name: string };
  machineFixedMinutes: string;
  machineMinutesPerUnit: string;
  energyRate: string;
  maintenancePerHour: string;
  failurePercent: string;
  setupMinutes: string;
  finishingMinutesPerUnit: string;
  laborPerHour: string;
  extras: {
    ref: Ref;
    name: string;
    basis: "LOT" | "UNIT";
    quantity: string;
    unitCost: string;
  }[];
  channel: {
    ref: Ref;
    name: string;
    fees: { label: string; percent: string }[];
    fixedCost: string;
  };
  mode: PricingMode;
  markupPercent: string;
  targetMarginPercent: string;
  informedUnitPrice: string;
}
export interface PricingV2Result {
  tax?: import("@/domain/tax/types").PricingTaxResult;
  material: string;
  energy: string;
  depreciation: string;
  maintenance: string;
  failure: string;
  labor: string;
  extras: string;
  commercialFixed: string;
  variableCost: string;
  fullCost: string;
  unitFullCost: string;
  theoreticalRevenue: string;
  offeredUnitPrice: string;
  offeredRevenue: string;
  fees: string;
  contribution: string;
  afterDepreciation: string;
  contributionMargin: string | null;
  warnings: ("BELOW_FULL_COST" | "ROUNDED_TARGET")[];
}
export interface PricingRequest {
  tax?: import("@/domain/tax/types").TaxRequest;
  technology: Technology;
  quantity: number;
  materials: { ref: Ref; consumptionPerUnit: string; fixedWaste: string }[];
  printerRef: Ref;
  machineFixedMinutes: string;
  machineMinutesPerUnit: string;
  setupMinutes: string;
  finishingMinutesPerUnit: string;
  extras: { ref: Ref; basis: "LOT" | "UNIT"; quantity: string }[];
  channelRef: Ref;
  mode: PricingMode;
  informedUnitPrice: string;
  expectedSettingsVersion: number;
}
export interface PricingSettingsValues {
  energyRate: string;
  maintenancePerHour: string;
  failurePercent: string;
  laborPerHour: string;
  markupPercent: string;
  targetMarginPercent: string;
}
export interface PricingChannelDTO {
  id: string;
  version: number;
  name: string;
  fees: { label: string; percent: string }[];
  fixedCost: string;
  active: boolean;
}
export interface PricingExtraDTO {
  id: string;
  version: number;
  name: string;
  unitCost: string;
  active: boolean;
}
export interface PricingCatalogDTO {
  tax?: import("@/domain/tax/types").TaxCatalog;
  settings: (PricingSettingsValues & { version: number }) | null;
  materials: MaterialDTO[];
  printers: PrinterDTO[];
  channels: PricingChannelDTO[];
  extras: PricingExtraDTO[];
}
export interface PricingSnapshotDTO {
  id: string;
  version: 2;
  input: PricingV2Input;
  result: PricingV2Result;
  createdAt: string;
  actorId: string;
  actorName: string;
}
export type StoredProductCalculation =
  CalculationInput | { version: 2; snapshotId: string };
export interface LineCostBinding {
  lineId: string;
  snapshotId: string;
  fingerprint: string;
  state: "VALID" | "STALE";
}
export interface DocumentCostsDTO {
  revisionId: string;
  bindings: LineCostBinding[];
  snapshots: PricingSnapshotDTO[];
}
