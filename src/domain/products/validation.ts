import { z } from "zod";
import Decimal from "decimal.js";
import { calculationSchema } from "@/domain/calculation/validation";
import { calculate } from "@/domain/calculation/calculate";
import type { CalculationInput } from "@/domain/calculation/types";
import { AppError } from "@/lib/errors";
import type { ProductInput } from "./types";
export const productSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().min(1).max(5000),
    paymentTerms: z.string().trim().min(1).max(1000),
    active: z.boolean(),
    calculation: calculationSchema,
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
export function productPrice(calculation: CalculationInput): string {
  const price = new Decimal(calculate(calculation).sale).toDecimalPlaces(
    2,
    Decimal.ROUND_HALF_UP,
  );
  if (price.gt("9999999999999999.99"))
    throw new AppError(
      "VALIDATION",
      "O preço calculado excede o limite permitido.",
    );
  return price.toFixed(2);
}
