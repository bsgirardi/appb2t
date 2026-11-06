import type { z } from "zod";
import type { posDraftSchema, calculatePosPayment } from "./validation";
export type PosDraftInput = z.infer<typeof posDraftSchema>;
export type PosProduct = {
  id: string;
  name: string;
  sku: string;
  price: string;
  commercialRevision: number;
  minimumQuantity: number;
  quantityTiers: { minQuantity: number; baseUnitPrice: string }[];
  available: number;
  reason: string | null;
};
export type PosOrderDTO = {
  id: string;
  version: number;
  input: PosDraftInput;
  updatedAt: string;
  receipt: null | {
    saleId: string;
    number: string;
    status: string;
    total: string;
    customerName: string;
    payment: ReturnType<typeof calculatePosPayment>;
    received: string;
    pending: string;
  };
};
export const emptyPosDraft: PosDraftInput = {
  items: [],
  customerId: null,
  customerVersion: null,
  customerName: "",
  newCustomer: null,
  discount: "0.00",
  method: "PIX",
  tendered: "",
};
