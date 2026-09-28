import type { CalculationInput } from "@/domain/calculation/types";
export interface ProductInput {
  name: string;
  description: string;
  paymentTerms: string;
  active: boolean;
  calculation: CalculationInput;
  materialId?: string | null;
  printerId?: string | null;
}
export interface PublicProductDTO {
  id: string;
  name: string;
  description: string;
  paymentTerms: string;
  price: string;
  imageUrl: string;
}
export interface ProductDTO extends PublicProductDTO, ProductInput {
  version: number;
}
