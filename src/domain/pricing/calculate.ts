import Decimal from "decimal.js";
import type { PricingV2Input, PricingV2Result } from "./types";
import { pricingV2Schema } from "./validation";
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
const MAX = "9999999999999999.99";
export function calculateV2(input: PricingV2Input): PricingV2Result {
  const v = pricingV2Schema.parse(input),
    n = v.quantity;
  const time = new D(v.machineFixedMinutes)
    .plus(new D(v.machineMinutesPerUnit).times(n))
    .div(60);
  const material = v.materials.reduce(
    (sum, m) =>
      sum.plus(
        new D(m.consumptionPerUnit)
          .times(n)
          .plus(m.fixedWaste)
          .div(1000)
          .times(m.pricePerBase),
      ),
    new D(0),
  );
  const energy = time.times(v.printer.watts).div(1000).times(v.energyRate);
  const depreciation = time
    .times(v.printer.acquisitionCost)
    .div(
      new D(v.printer.amortizationMonths)
        .times(v.printer.daysPerMonth)
        .times(v.printer.hoursPerDay),
    );
  const maintenance = time.times(v.maintenancePerHour);
  const failure = material
    .plus(energy)
    .plus(maintenance)
    .times(v.failurePercent)
    .div(100);
  const labor = new D(v.setupMinutes)
    .plus(new D(v.finishingMinutesPerUnit).times(n))
    .div(60)
    .times(v.laborPerHour);
  const extras = v.extras.reduce(
    (sum, e) =>
      sum.plus(
        new D(e.quantity).times(e.unitCost).times(e.basis === "UNIT" ? n : 1),
      ),
    new D(0),
  );
  const commercialFixed = new D(v.channel.fixedCost);
  const variableCost = material
    .plus(energy)
    .plus(maintenance)
    .plus(failure)
    .plus(labor)
    .plus(extras)
    .plus(commercialFixed);
  const fullCost = variableCost.plus(depreciation),
    unitFullCost = fullCost.div(n);
  const feeRate = v.channel.fees
    .reduce((a, x) => a.plus(x.percent), new D(0))
    .div(100);
  const theoreticalRevenue =
    v.mode === "INFORMED"
      ? new D(v.informedUnitPrice).times(n)
      : v.mode === "MARKUP"
        ? fullCost
            .times(new D(1).plus(new D(v.markupPercent).div(100)))
            .div(new D(1).minus(feeRate))
        : variableCost.div(
            new D(1)
              .minus(feeRate)
              .minus(new D(v.targetMarginPercent).div(100)),
          );
  const offeredUnitPrice = theoreticalRevenue.div(n).toDecimalPlaces(2),
    offeredRevenue = offeredUnitPrice.times(n);
  const fees = offeredRevenue.times(feeRate),
    contribution = offeredRevenue.minus(fees).minus(variableCost),
    afterDepreciation = contribution.minus(depreciation);
  const contributionMargin = offeredRevenue.isZero()
    ? null
    : contribution.div(offeredRevenue).times(100).toFixed();
  const values = {
    material,
    energy,
    depreciation,
    maintenance,
    failure,
    labor,
    extras,
    commercialFixed,
    variableCost,
    fullCost,
    unitFullCost,
    theoreticalRevenue,
    offeredUnitPrice,
    offeredRevenue,
    fees,
    contribution,
    afterDepreciation,
  };
  for (const value of Object.values(values))
    if (!value.isFinite() || value.abs().gt(MAX))
      throw new Error("O resultado excede o limite monetário permitido.");
  const warnings: PricingV2Result["warnings"] = [];
  if (afterDepreciation.lt(0)) warnings.push("BELOW_FULL_COST");
  if (
    v.mode === "CONTRIBUTION" &&
    contributionMargin !== null &&
    !new D(contributionMargin).eq(v.targetMarginPercent)
  )
    warnings.push("ROUNDED_TARGET");
  return {
    ...Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, value.toFixed()]),
    ),
    contributionMargin,
    warnings,
  } as PricingV2Result;
}
