import Decimal from "decimal.js";
import { validateCalculation } from "./validation";
import type { CalculationInput, CalculationResult } from "./types";
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export function calculate(input: CalculationInput): CalculationResult {
  const v = validateCalculation(input),
    p = v.printer,
    s = v.settings;
  const time = new D(v.hours).plus(new D(v.minutes).div(60));
  const material = new D(v.consumption).div(1000).times(v.materialPrice);
  const energy = time.times(p.watts).div(1000).times(s.energyRate);
  const hourlyMachine = new D(p.acquisitionCost).div(
    new D(p.amortizationMonths).times(p.daysPerMonth).times(p.hoursPerDay),
  );
  const machine = time.times(hourlyMachine);
  const maintenance = material
    .plus(energy)
    .times(s.maintenancePercent)
    .div(100);
  const subtotal = material.plus(energy).plus(machine).plus(maintenance);
  const failure = subtotal.times(s.failurePercent).div(100),
    finishing = subtotal.times(s.finishingPercent).div(100),
    fixation = new D(s.fixation);
  const total = subtotal.plus(failure).plus(finishing).plus(fixation),
    profit = total.times(s.markupPercent).div(100),
    sale = total.plus(profit);
  return Object.fromEntries(
    Object.entries({
      material,
      energy,
      hourlyMachine,
      machine,
      maintenance,
      subtotal,
      failure,
      finishing,
      fixation,
      total,
      profit,
      sale,
    }).map(([key, value]) => [key, value.toFixed()]),
  ) as unknown as CalculationResult;
}
export function formatBRL(value: string): string {
  const [whole, cents] = new D(value).toFixed(2).split(".");
  return `R$ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${cents}`;
}
