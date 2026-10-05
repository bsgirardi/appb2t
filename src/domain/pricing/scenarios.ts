import { z } from "zod";
import { calculateV2 } from "./calculate";
import { quantitySchema } from "./validation";
import type { PricingV2Input, PricingV2Result } from "./types";
export function calculateScenarios(
  input: PricingV2Input,
  quantities: number[],
): { quantity: number; result: PricingV2Result }[] {
  return z
    .array(quantitySchema)
    .max(10)
    .parse(quantities)
    .map((quantity) => ({
      quantity,
      result: calculateV2({ ...input, quantity }),
    }));
}
