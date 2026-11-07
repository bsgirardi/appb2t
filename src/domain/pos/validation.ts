import { z } from "zod";
import Decimal from "decimal.js";
import {
  documentSchema,
  moneySchema,
  parseMoney,
} from "@/domain/commerce/validation";
import { AppError } from "@/lib/errors";
export const posDraftSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productId: z.string().min(1).max(100),
            quantity: z.number().int().min(1).max(100000),
            commercialRevision: z.number().int().positive(),
            unitPrice: moneySchema,
          })
          .strict(),
      )
      .max(100)
      .refine(
        (items) => new Set(items.map((i) => i.productId)).size === items.length,
        "Produto repetido.",
      ),
    customerId: z.string().min(1).max(100).nullable(),
    customerVersion: z.number().int().positive().nullable().default(null),
    customerName: z.string().trim().max(160).default(""),
    newCustomer: z
      .object({
        name: z.string().trim().min(2).max(160),
        phone: z.string().trim().max(50),
        email: z.union([z.literal(""), z.email().max(254)]),
      })
      .strict()
      .nullable(),
    discount: moneySchema,
    method: z.enum(["PIX", "CASH", "CARD"]),
    tendered: z.string().max(24),
  })
  .strict()
  .refine(
    (v) => !(v.customerId && v.newCustomer),
    "Selecione um cliente ou cadastre um novo.",
  )
  .refine(
    (v) => v.method === "CASH" || v.tendered === "",
    "Valor entregue é exclusivo de dinheiro.",
  );
export const posDocumentSchema = documentSchema
  .extend({
    customerId: z.string().min(1).max(100).nullable(),
    customerIdentification: z.literal("UNIDENTIFIED").optional(),
  })
  .refine(
    (v) =>
      v.customerId === null
        ? v.customerIdentification === "UNIDENTIFIED"
        : !v.customerIdentification,
    "Confira a identificação do comprador.",
  );
export function calculatePosPayment(
  total: string,
  method: "PIX" | "CASH" | "CARD",
  tendered: string,
) {
  if (method !== "CASH") return { method, tendered: null, change: "0.00" };
  const value = parseMoney(tendered, { positive: true });
  if (new Decimal(value).lt(total))
    throw new AppError("VALIDATION", "O valor entregue é menor que o total.");
  return {
    method,
    tendered: value,
    change: new Decimal(value).minus(total).toFixed(2),
  };
}
