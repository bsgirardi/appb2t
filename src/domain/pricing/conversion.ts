import type { CalculationInput } from "@/domain/calculation/types";
import { validateCalculation } from "@/domain/calculation/validation";
export function buildV2Draft(legacy: CalculationInput): {
  quantity: 1;
  legacy: CalculationInput;
  pending: string[];
} {
  return {
    quantity: 1,
    legacy: validateCalculation(structuredClone(legacy)),
    pending: ["maintenance", "finishing", "fixation", "settingsV2"],
  };
}
