import { z } from "zod";
import { AppError } from "@/lib/errors";

export const CATALOG_MAX_QUANTITY = 100000;
export const CATALOG_MAX_LINES = 20;
export const CATALOG_MAX_KIT_QUANTITY =
  CATALOG_MAX_LINES * CATALOG_MAX_QUANTITY;

export const catalogQuantitySchema = z
  .number({ error: "Informe uma quantidade inteira." })
  .int("Informe uma quantidade inteira.")
  .min(1, "Informe pelo menos uma unidade.")
  .max(
    CATALOG_MAX_QUANTITY,
    "Informe no máximo 100.000 unidades por configuração.",
  );

export function validateProductQuantity(quantity: number, minimumQuantity = 1) {
  const value = catalogQuantitySchema.parse(quantity);
  const minimum = catalogQuantitySchema.parse(minimumQuantity);
  if (value < minimum)
    throw new AppError(
      "VALIDATION",
      `A quantidade mínima é de ${minimum} unidades por configuração.`,
    );
  return value;
}
