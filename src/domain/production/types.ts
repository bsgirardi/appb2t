export type Meta = {
  operationKey: string;
  expectedVersion: number;
  reason?: string;
};
export type FinishedDTO = {
  id: string;
  productId: string | null;
  inventoriedAt: string | null;
  active: boolean;
  version: number;
  physical: string;
  reserved: string;
  available: string;
};
export type OrderDTO = {
  id: string;
  sequence: number;
  version: number;
  origin: string;
  saleId: string | null;
  status: string;
  responsibleId: string | null;
  dueDate: string | null;
  notes: string;
  lines: OrderLineDTO[];
};
export type OrderLineDTO = {
  id: string;
  productId: string | null;
  saleLineKey: string | null;
  description: string;
  technology: string;
  targetUnits: number;
  goodUnits: number;
  failedUnits: number;
  canceledUnits: number;
  plannedPrinterId: string | null;
};
