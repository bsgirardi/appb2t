import { readProductConfiguration } from "@/domain/products/configuration";
export function isConsignmentProductEligible(product: {
  configuration: unknown;
  colors: string[];
  sizes: string[];
}): boolean {
  try {
    return (
      product.colors.length <= 1 &&
      product.sizes.length <= 1 &&
      readProductConfiguration(product.configuration).fields.length === 0
    );
  } catch {
    return false;
  }
}
