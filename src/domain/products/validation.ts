import { z } from "zod";
import Decimal from "decimal.js";
import {
  storedCalculationSchema,
  isBatchCalculation,
} from "@/domain/pricing/product-calculations";
import { calculate } from "@/domain/calculation/calculate";
import type {
  StoredProductCalculation,
  PricingSnapshotDTO,
} from "@/domain/pricing/types";
import { AppError } from "@/lib/errors";
import type { ProductInput } from "./types";
import { commercialShape } from "./commercial";
const finalPriceSchema = z
  .string()
  .trim()
  .regex(/^\d{1,16}([.,]\d{1,2})?$/)
  .transform((value) => value.replace(",", "."))
  .refine((value) => new Decimal(value).gt(0), "Informe um preço positivo.")
  .transform((value) => new Decimal(value).toFixed(2));
export function parseFinalPrice(raw: string): string {
  return finalPriceSchema.parse(raw);
}
export const productSchema = z
  .object({
    ...commercialShape,
    seoTitle: z.string().trim().max(70).optional(),
    seoDescription: z.string().trim().max(170).optional(),
    collectionIds: z
      .array(z.string().min(1).max(100))
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length),
    images: z
      .array(
        z.union([
          z.object({ id: z.string().min(1).max(100) }).strict(),
          z
            .object({ uploadKey: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/) })
            .strict(),
        ]),
      )
      .min(1)
      .max(10)
      .refine(
        (images) =>
          new Set(
            images.map((i) =>
              "id" in i ? `id:${i.id}` : `upload:${i.uploadKey}`,
            ),
          ).size === images.length,
        "Fotos repetidas.",
      ),
    price: finalPriceSchema,
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().min(1).max(5000),
    paymentTerms: z.string().trim().min(1).max(1000),
    active: z.boolean(),
    calculation: storedCalculationSchema,
    materialId: z.string().min(1).max(100).nullable().optional(),
    printerId: z.string().min(1).max(100).nullable().optional(),
  })
  .strict();
export const updateProductSchema = productSchema.extend({
  expectedVersion: z.number().int().positive(),
});
export const productStateSchema = z
  .object({ active: z.boolean(), expectedVersion: z.number().int().positive() })
  .strict();
export function validateProduct(input: unknown): ProductInput {
  return productSchema.parse(input);
}
export function suggestedProductPrice(
  calculation: StoredProductCalculation,
  snapshot?: PricingSnapshotDTO,
): string {
  if (
    isBatchCalculation(calculation) &&
    snapshot?.id !== calculation.snapshotId
  )
    throw new AppError("VALIDATION", "Carregue a memória de custo do produto.");
  const price = new Decimal(
    isBatchCalculation(calculation)
      ? snapshot!.result.offeredUnitPrice
      : calculate(calculation).sale,
  ).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  if (price.gt("9999999999999999.99"))
    throw new AppError(
      "VALIDATION",
      "O preço calculado excede o limite permitido.",
    );
  return price.toFixed(2);
}
