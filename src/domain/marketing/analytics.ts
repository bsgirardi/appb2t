import { z } from "zod";
export const analyticsSchema = z
  .object({
    measurementId: z
      .string()
      .trim()
      .regex(
        /^(?:|G-[A-Z0-9]{4,20})$/,
        "Informe o identificador G- da tag GA4.",
      )
      .default(""),
    propertyId: z
      .string()
      .trim()
      .regex(/^\d{0,20}$/, "Informe somente o número da propriedade GA4.")
      .default(""),
    searchConsoleSite: z
      .string()
      .trim()
      .max(300)
      .refine(
        (s) =>
          s === "" ||
          /^sc-domain:[a-z0-9.-]+$/.test(s) ||
          /^https:\/\/[a-z0-9.-]+(?::\d+)?\/$/.test(s),
        "Use sc-domain:dominio ou https://dominio/.",
      )
      .default(""),
  })
  .strict();
export type AnalyticsSettings = z.infer<typeof analyticsSchema>;
