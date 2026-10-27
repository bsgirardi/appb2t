import Decimal from "decimal.js";
import { z } from "zod";
import { AppError } from "@/lib/errors";
export const catalogCommercialShape = {
  priceMin: z.string().max(100).optional(),
  priceMax: z.string().max(100).optional(),
  availability: z.string().max(100).optional(),
};
export type CatalogCommercialFilters = z.infer<
  z.ZodObject<typeof catalogCommercialShape>
>;
export const catalogAvailability = {
  AVAILABLE: "Disponível",
  MADE_TO_ORDER: "Sob encomenda",
  CONSULT: "Consulte disponibilidade",
  UNAVAILABLE: "Indisponível",
} as const;
export function catalogCommercialErrors(filters: CatalogCommercialFilters) {
  const errors: Partial<Record<keyof CatalogCommercialFilters, string>> = {};
  for (const key of ["priceMin", "priceMax"] as const) {
    const text = filters[key]?.trim();
    if (
      (filters[key]?.length ?? 0) > 100 ||
      (text && !/^\d{1,16}([.,]\d{1,2})?$/.test(text))
    )
      errors[key] =
        "Informe um valor em reais, com até duas casas decimais e sem separador de milhar.";
  }
  if (
    filters.availability &&
    !Object.hasOwn(catalogAvailability, filters.availability)
  )
    errors.availability = "Selecione uma disponibilidade válida.";
  if (
    !errors.priceMin &&
    !errors.priceMax &&
    filters.priceMin?.trim() &&
    filters.priceMax?.trim() &&
    new Decimal(filters.priceMin.trim().replace(",", ".")).gt(
      filters.priceMax.trim().replace(",", "."),
    )
  )
    errors.priceMax = "O preço máximo deve ser maior ou igual ao mínimo.";
  return errors;
}
export function parseCatalogCommercialFilters(
  filters: CatalogCommercialFilters,
) {
  const errors = catalogCommercialErrors(filters);
  if (Object.keys(errors).length)
    throw new AppError("VALIDATION", Object.values(errors)[0]!);
  return {
    ...(filters.priceMin?.trim()
      ? { priceMin: filters.priceMin.trim().replace(",", ".") }
      : {}),
    ...(filters.priceMax?.trim()
      ? { priceMax: filters.priceMax.trim().replace(",", ".") }
      : {}),
    ...(filters.availability
      ? {
          availability:
            filters.availability as keyof typeof catalogAvailability,
        }
      : {}),
  };
}
