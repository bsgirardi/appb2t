import type { CalculationInput } from "@/domain/calculation/types";
export type ImageSelection = { id: string } | { uploadKey: string };
export interface ProductImageDTO {
  id: string;
  url: string;
  position: number;
}
export interface ProductInput {
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
export interface PublicProductDTO {
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
