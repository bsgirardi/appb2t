import Decimal from "decimal.js";
import { CATALOG_MAX_KIT_QUANTITY } from "@/domain/products/quantity";
import { z } from "zod";
import { checkoutPolicySchema } from "@/domain/checkout/policy";
import { positiveCatalogMoney } from "@/domain/products/quantity-pricing";
const minQuantity = z.number().int().min(1).max(CATALOG_MAX_KIT_QUANTITY);
export const kitDiscountTierSchema = z.discriminatedUnion("kind", [
  z
    .object({
      minQuantity,
      kind: z.literal("PERCENT"),
      percent: z
        .string()
        .regex(/^\d{1,2}(\.\d{1,2})?$/)
        .refine((v) => new Decimal(v).gt(0) && new Decimal(v).lt(100))
        .transform((v) => new Decimal(v).toFixed(2)),
    })
    .strict(),
  z
    .object({
      minQuantity,
      kind: z.literal("FIXED"),
      amount: positiveCatalogMoney,
    })
    .strict(),
]);
export const kitDiscountTiersSchema = z
  .array(kitDiscountTierSchema)
  .max(10)
  .refine(
    (rows) => new Set(rows.map((r) => r.minQuantity)).size === rows.length,
    "Quantidades mínimas repetidas.",
  );
export const kitDefinitionSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    checkoutPolicy: checkoutPolicySchema.optional(),
    description: z.string().trim().max(2000),
    active: z.boolean(),
    position: z.number().int().min(0).max(99999),
    productIds: z
      .array(z.string().min(1).max(100))
      .max(50)
      .refine((ids) => new Set(ids).size === ids.length, "Produtos repetidos."),
    tiers: kitDiscountTiersSchema,
  })
  .strict()
  .refine((v) => !v.active || v.productIds.length > 0, {
    message: "Escolha ao menos um produto permitido.",
    path: ["productIds"],
  });
export const updateKitSchema = kitDefinitionSchema.safeExtend({
  expectedVersion: z.number().int().positive(),
});
