import { z } from "zod";
import { catalogQuantitySchema } from "./quantity";
export const availabilityLabels = {
  CONSULT: "Consulte disponibilidade",
  AVAILABLE: "Disponível",
  MADE_TO_ORDER: "Sob encomenda",
  UNAVAILABLE: "Indisponível",
} as const;
export type Availability = keyof typeof availabilityLabels;
export interface CommercialFields {
  minimumQuantity?: number;
  sku?: string;
  shortDescription?: string;
  specifications?: string;
  colors?: string[];
  sizes?: string[];
  availability?: Availability;
  leadTimeDays?: number | null;
}
const options = z
  .array(z.string().trim().max(60))
  .max(30)
  .transform((values) => values.filter(Boolean))
  .refine(
    (values) =>
      new Set(values.map((v) => v.toLocaleLowerCase("pt-BR"))).size ===
      values.length,
    "Opções repetidas.",
  );
export const commercialShape = {
  minimumQuantity: catalogQuantitySchema.optional(),
  sku: z
    .string()
    .trim()
    .max(64)
    .regex(
      /^[a-zA-Z0-9._-]*$/,
      "Use letras, números, ponto, hífen ou sublinhado.",
    )
    .transform((v) => v.toUpperCase())
    .optional(),
  shortDescription: z.string().trim().max(240).optional(),
  specifications: z.string().trim().max(3000).optional(),
  colors: options.optional(),
  sizes: options.optional(),
  availability: z
    .enum(["CONSULT", "AVAILABLE", "MADE_TO_ORDER", "UNAVAILABLE"])
    .optional(),
  leadTimeDays: z.number().int().min(1).max(365).nullable().optional(),
};
