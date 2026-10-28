import { z } from "zod";
import Decimal from "decimal.js";
import { calculateV2 } from "./calculate";
import { pricingV2Schema, quantitySchema } from "./validation";
import type { PricingV2Input, PricingV2Result } from "./types";
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export interface PricingScenario {
  quantity: number;
  result: PricingV2Result;
  machineMinutes: string;
  contributionPerMachineHour: string;
  materials: { name: string; unit: "G" | "ML"; consumption: string }[];
}
export function calculateScenarios(
  input: PricingV2Input,
  quantities: number[],
): PricingScenario[] {
  return z
    .array(quantitySchema)
    .max(10)
    .parse(quantities)
    .map((quantity) => {
      const scenario = pricingV2Schema.parse({ ...input, quantity });
      const result = calculateV2(scenario);
      const machineMinutes = new D(scenario.machineFixedMinutes).plus(
        new D(scenario.machineMinutesPerUnit).times(quantity),
      );
      return {
        quantity,
        result,
        machineMinutes: machineMinutes.toFixed(),
        contributionPerMachineHour: new D(result.contribution)
          .times(60)
          .div(machineMinutes)
          .toFixed(),
        materials: scenario.materials.map((m) => ({
          name: m.name,
          unit: m.unit,
          consumption: new D(m.consumptionPerUnit)
            .times(quantity)
            .plus(m.fixedWaste)
            .toFixed(),
        })),
      };
    });
}
