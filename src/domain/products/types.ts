import type { ProductConfiguration, PriceMode } from "./configuration";
import type { QuantityTier } from "./quantity-pricing";
import type {
  StoredProductCalculation,
  PricingSnapshotDTO,
} from "@/domain/pricing/types";
import type { CommercialFields } from "./commercial";
export type ImageSelection = { id: string } | { uploadKey: string };
export interface ProductImageDTO {
  id: string;
  url: string;
  position: number;
}
export interface ProductInput extends CommercialFields {
  checkoutPolicy?: import("@/domain/checkout/types").CheckoutOfferPolicy;
  quantityTiers?: QuantityTier[];
  compositionImageId?: string | null;
  configuration?: ProductConfiguration;
  publicPriceMode?: PriceMode;
  seoTitle?: string;
  seoDescription?: string;
  collectionIds: string[];
  images: ImageSelection[];
  price: string;
  name: string;
  description: string;
  paymentTerms: string;
  active: boolean;
  calculation: StoredProductCalculation;
  materialId?: string | null;
  printerId?: string | null;
}
export interface PublicProductDTO extends CommercialFields {
  checkoutPolicy?: import("@/domain/checkout/types").CheckoutOfferPolicy;
  quantityTiers?: QuantityTier[];
  compositionImageId?: string | null;
  configuration?: ProductConfiguration;
  publicPriceMode?: PriceMode;
  commercialRevision?: number;
  seoTitle?: string;
  seoDescription?: string;
  images: ProductImageDTO[];
  id: string;
  name: string;
  description: string;
  paymentTerms: string;
  price: string | null;
  imageUrl: string;
}
export interface ProductDTO
  extends Omit<PublicProductDTO, "price">, Omit<ProductInput, "images"> {
  version: number;
  pricingSnapshot?: PricingSnapshotDTO;
}
