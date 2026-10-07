import { z } from "zod";
import { quantity } from "./quantities";
import { civilDateSchema } from "@/domain/commerce/validation";
export const stockQuantity = z.string().transform((v, ctx) => {
  try {
    return quantity(v);
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "Quantidade inválida: use até seis casas decimais.",
    });
    return z.NEVER;
  }
});
export const commandMeta = {
  operationKey: z.string().uuid(),
  expectedVersion: z.number().int().min(0),
  reason: z.string().trim().min(3).max(2000).optional(),
};
export const itemSchema = z
  .object({
    ...commandMeta,
    id: z.string().optional(),
    name: z.string().trim().min(2).max(160),
    unit: z.enum(["G", "ML", "UNIT"]),
    materialId: z.string().nullable().optional(),
    extraId: z.string().nullable().optional(),
    method: z.enum(["WEIGHTED_AVERAGE", "MANUAL"]),
    manualUnitCost: stockQuantity.nullable().optional(),
    active: z.boolean().default(true),
  })
  .strict()
  .refine(
    (v) => !(v.materialId && v.extraId),
    "Vincule um material ou um insumo.",
  )
  .refine(
    (v) => v.method !== "MANUAL" || v.manualUnitCost != null,
    "Informe o custo manual.",
  );
export const openingSchema = z
  .object({
    ...commandMeta,
    itemId: z.string(),
    quantity: stockQuantity,
    value: stockQuantity.optional(),
    effectiveDate: civilDateSchema,
  })
  .strict();
export type ItemInput = z.infer<typeof itemSchema>;
export type OpeningInput = z.infer<typeof openingSchema>;
export const identitySchema = z
  .object({
    ...commandMeta,
    itemId: z.string(),
    label: z.string().trim().min(1).max(160),
  })
  .strict();
export const allocationSchema = z
  .object({ identityId: z.string().nullable(), quantity: stockQuantity })
  .strict();
export const movementSchema = z
  .object({
    ...commandMeta,
    itemId: z.string(),
    kind: z.enum(["CONSUMPTION", "LOSS", "ADJUSTMENT_IN", "ADJUSTMENT_OUT"]),
    quantity: stockQuantity,
    allocations: z.array(allocationSchema).max(100).optional(),
    value: stockQuantity.optional(),
    effectiveDate: civilDateSchema,
  })
  .strict();
export const receiveSchema = z
  .object({
    ...commandMeta,
    supplier: z.string().trim().min(2).max(160),
    document: z.string().trim().max(160).default(""),
    effectiveDate: civilDateSchema,
    lines: z
      .array(
        z
          .object({
            itemId: z.string(),
            quantity: stockQuantity,
            allocations: z.array(allocationSchema).max(100).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export type MovementInput = z.infer<typeof movementSchema>;
export type ReceiveInput = z.infer<typeof receiveSchema>;
export const reserveSchema = z
  .object({
    ...commandMeta,
    itemId: z.string(),
    saleId: z.string(),
    lineKey: z.string(),
    quantity: stockQuantity,
    effectiveDate: civilDateSchema,
  })
  .strict();
export const consumeSchema = z
  .object({
    ...commandMeta,
    reservationId: z.string(),
    quantity: stockQuantity,
    allowExcess: z.boolean().default(false),
    allocations: z.array(allocationSchema).max(100).optional(),
    effectiveDate: civilDateSchema,
  })
  .strict();
export const releaseSchema = z
  .object({
    ...commandMeta,
    reservationId: z.string(),
    quantity: stockQuantity,
    reason: z.string().trim().min(3).max(2000),
  })
  .strict();
import {
  moneySchema,
  positiveMoneySchema,
  installmentSchema,
} from "@/domain/commerce/validation";
const confirmBase = {
  ...commandMeta,
  receiptId: z.string(),
  total: positiveMoneySchema,
  lines: z
    .array(z.object({ id: z.string(), value: moneySchema }).strict())
    .min(1)
    .max(100),
};
export const confirmReceiptSchema = z.discriminatedUnion("mode", [
  z
    .object({
      ...confirmBase,
      mode: z.literal("CREATE"),
      categoryId: z.string(),
      installments: z.array(installmentSchema).min(1).max(120),
    })
    .strict(),
  z
    .object({
      ...confirmBase,
      mode: z.literal("LINK"),
      entryIds: z.array(z.string()).min(1).max(120),
    })
    .strict(),
]);
export type ConfirmReceiptInput = z.infer<typeof confirmReceiptSchema>;
export const correctionSchema = z
  .object({
    ...commandMeta,
    sourceId: z.string(),
    kind: z.enum(["RETURN_CONSUMPTION", "RETURN_SUPPLIER"]),
    quantity: stockQuantity,
    allocations: z.array(allocationSchema).max(100).optional(),
    effectiveDate: civilDateSchema,
    reason: z.string().trim().min(3).max(2000),
  })
  .strict();
export const stockFilterSchema = z
  .object({
    query: z.string().trim().max(160).default(""),
    negative: z
      .union([
        z.boolean(),
        z.enum(["true", "false"]).transform((v) => v === "true"),
      ])
      .default(false),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export type StockFilter = z.input<typeof stockFilterSchema>;
