import { z } from "zod";
import { seoSchema } from "@/domain/marketing/seo";
import { analyticsSchema } from "@/domain/marketing/analytics";
export const sectionNames = {
  banners: "Banners",
  featured: "Coleções em destaque",
  catalog: "Todos os produtos",
  about: "Sobre a loja",
} as const;
export const storefrontSchema = z
  .object({
    seo: seoSchema.optional(),
    analytics: analyticsSchema.optional(),
    showHero: z.boolean().default(true),
    seoTitle: z.string().trim().max(70).default(""),
    seoDescription: z.string().trim().max(170).default(""),
    faq: z
      .array(
        z
          .object({
            question: z.string().trim().min(1).max(160),
            answer: z.string().trim().min(1).max(2000),
          })
          .strict(),
      )
      .max(12)
      .default([]),
    banners: z
      .array(
        z
          .object({
            title: z.string().trim().min(1).max(100),
            text: z.string().trim().max(300),
            collectionId: z.string().max(100),
            buttonText: z.string().trim().min(1).max(40),
          })
          .strict(),
      )
      .max(3)
      .default([]),
    featuredCollectionIds: z
      .array(z.string().min(1).max(100))
      .max(4)
      .refine((ids) => new Set(ids).size === ids.length, "Coleções repetidas.")
      .default([]),
    sectionOrder: z
      .array(z.enum(["banners", "featured", "catalog", "about"]))
      .length(4)
      .refine(
        (ids) => new Set(ids).size === 4,
        "Informe cada seção uma única vez.",
      )
      .default(["banners", "featured", "catalog", "about"]),
    aboutTitle: z.string().trim().max(100).default(""),
    aboutText: z.string().trim().max(2000).default(""),
  })
  .strict();
export type StorefrontConfig = z.infer<typeof storefrontSchema>;
export const defaultStorefront = storefrontSchema.parse({});
