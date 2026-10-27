import Decimal from "decimal.js";
import { z } from "zod";
import { catalogQuantitySchema } from "./quantity";
export const positiveCatalogMoney = z
  .string()
  .regex(/^\d{1,16}(\.\d{1,2})?$/)
  .refine(
    (v) => new Decimal(v).gt(0) && new Decimal(v).lte("9999999999999999.99"),
    "Informe um valor positivo dentro do limite.",
  )
  .transform((v) => new Decimal(v).toFixed(2));
export const quantityTiersSchema = z
  .array(
    z
      .object({
        minQuantity: catalogQuantitySchema,
        baseUnitPrice: positiveCatalogMoney,
      })
      .strict(),
  )
  .max(10)
  .refine(
    (rows) => new Set(rows.map((r) => r.minQuantity)).size === rows.length,
    "Quantidades mínimas repetidas.",
  );
export type QuantityTier = z.infer<typeof quantityTiersSchema>[number];
export function quantityBasePrice(
  base: string,
  quantity: number,
  tiers: QuantityTier[],
): string {
  const price = positiveCatalogMoney.parse(base);
  catalogQuantitySchema.parse(quantity);
  return (
    quantityTiersSchema
      .parse(tiers)
      .filter((t) => t.minQuantity <= quantity)
      .sort((a, b) => b.minQuantity - a.minQuantity)[0]?.baseUnitPrice ?? price
  );
}
