export type Quantity = string;
export type Unit = "G" | "ML" | "UNIT";
export type CostMethod = "WEIGHTED_AVERAGE" | "MANUAL";
export type StockState = {
  physical: Quantity;
  reserved: Quantity;
  available: Quantity;
  shortage: Quantity;
};
export type OperationMeta = {
  operationKey: string;
  expectedVersion: number;
  reason?: string;
  effectiveDate: string;
};
export type StockAllocation = { identityId: string | null; quantity: Quantity };
