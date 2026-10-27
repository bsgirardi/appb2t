import type { Prisma } from "@prisma/client";
import { readCheckoutPolicy } from "@/domain/checkout/policy";
import type { PublicProductDTO } from "@/domain/products/types";
import type { Availability } from "@/domain/products/commercial";
import { quantityTiersSchema } from "@/domain/products/quantity-pricing";
import {
  readProductConfiguration,
  priceModeSchema,
} from "@/domain/products/configuration";
export const publicProductSelect = {
  minimumQuantity: true,
  checkoutPolicy: true,
  quantityTiers: true,
  compositionImageId: true,
  publicPriceMode: true,
  commercialRevision: true,
  configuration: true,
  sku: true,
  shortDescription: true,
  specifications: true,
  colors: true,
  sizes: true,
  availability: true,
  leadTimeDays: true,
  seoTitle: true,
  seoDescription: true,
  images: {
    select: { id: true, position: true },
    orderBy: { position: "asc" as const },
  },
  id: true,
  name: true,
  description: true,
  paymentTerms: true,
  price: true,
} as const;
type PublicRow = Prisma.ProductGetPayload<{
  select: typeof publicProductSelect;
}>;
export function toPublicProduct(row: PublicRow): PublicProductDTO {
  return {
    minimumQuantity: row.minimumQuantity,
    checkoutPolicy: readCheckoutPolicy(row.checkoutPolicy),
    quantityTiers: quantityTiersSchema.parse(row.quantityTiers),
    compositionImageId: row.compositionImageId,
    id: row.id,
    name: row.name,
    sku: row.sku ?? "",
    shortDescription: row.shortDescription,
    specifications: row.specifications,
    colors: row.colors,
    sizes: row.sizes,
    availability: row.availability as Availability,
    leadTimeDays: row.leadTimeDays,
    description: row.description,
    paymentTerms: row.paymentTerms,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    price: row.publicPriceMode === "CONSULT" ? null : row.price.toFixed(2),
    publicPriceMode: priceModeSchema.parse(row.publicPriceMode),
    commercialRevision: row.commercialRevision,
    configuration: readProductConfiguration(row.configuration),
    images: row.images.map((i) => ({
      ...i,
      url: `/api/products/${row.id}/images/${i.id}`,
    })),
    imageUrl: `/api/products/${row.id}/image`,
  };
}
