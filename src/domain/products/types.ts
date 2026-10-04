import type { CalculationInput } from "@/domain/calculation/types";
import type { CommercialFields } from "./commercial";
export type ImageSelection = { id: string } | { uploadKey: string };
export interface ProductImageDTO {
  id: string;
  url: string;
  position: number;
}
export interface ProductInput extends CommercialFields {
  seoTitle?: string;
  seoDescription?: string;
  collectionIds: string[];
  images: ImageSelection[];
  price: string;
  name: string;
  description: string;
  paymentTerms: string;
  active: boolean;
  calculation: CalculationInput;
  materialId?: string | null;
  printerId?: string | null;
}
export interface PublicProductDTO extends CommercialFields {
  seoTitle?: string;
  seoDescription?: string;
  images: ProductImageDTO[];
  id: string;
  name: string;
  description: string;
  paymentTerms: string;
  price: string;
  imageUrl: string;
}
export interface ProductDTO
  extends PublicProductDTO, Omit<ProductInput, "images"> {
  version: number;
}
