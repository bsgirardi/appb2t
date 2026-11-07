import Decimal from "decimal.js";
import { calculateV2 } from "./calculate";
import type { PricingV2Input, PricingV2Result } from "./types";
import { pricingV2Schema } from "./validation";
import { calculateTax } from "@/domain/tax/calculate";
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

/** Inputs without tax keep the original V2 algorithm, including rounding. */
export function calculatePricing(raw: PricingV2Input): PricingV2Result {
  if (!raw.tax) return calculateV2(raw);
  const v = pricingV2Schema.parse(raw);
  const { tax: premise, ...legacy } = v;
  const costs = calculateV2({
    ...legacy,
    mode: "INFORMED",
    informedUnitPrice: "0",
  });
  const usable = calculateTax("0", premise).amount !== null;
  const taxRate =
    usable && premise?.profile?.regime === "SIMPLES"
      ? new D(premise.profile.percent!).div(100)
      : new D(0);
  const fees = v.channel.fees
    .reduce((s, f) => s.plus(f.percent), new D(0))
    .div(100);
  const denominator = new D(1)
    .minus(fees)
    .minus(taxRate)
    .minus(
      v.mode === "CONTRIBUTION" ? new D(v.targetMarginPercent).div(100) : 0,
    );
  if (v.mode !== "INFORMED" && denominator.lte(0))
    throw Error("Preço inviável: taxas, tributo e meta somam 100% ou mais.");
  const theoretical =
    v.mode === "INFORMED"
      ? new D(v.informedUnitPrice).times(v.quantity)
      : v.mode === "MARKUP"
        ? new D(costs.fullCost)
            .times(new D(1).plus(new D(v.markupPercent).div(100)))
            .div(denominator)
        : new D(costs.variableCost).div(denominator);
  const unit = theoretical.div(v.quantity).toFixed(2);
  const result = calculateV2({
    ...legacy,
    mode: "INFORMED",
    informedUnitPrice: unit,
  });
  const tax = calculateTax(result.offeredRevenue, premise);
  const contribution =
    tax.amount === null
      ? null
      : new D(result.contribution).minus(tax.amount).toFixed();
  const afterDepreciation =
    tax.amount === null
      ? null
      : new D(result.afterDepreciation).minus(tax.amount).toFixed();
  const margin =
    contribution === null || new D(result.offeredRevenue).isZero()
      ? null
      : new D(contribution).div(result.offeredRevenue).times(100).toFixed();
  const warnings: PricingV2Result["warnings"] = [];
  if (new D(afterDepreciation ?? result.afterDepreciation).lt(0))
    warnings.push("BELOW_FULL_COST");
  if (
    v.mode === "CONTRIBUTION" &&
    margin !== null &&
    new D(margin).lt(v.targetMarginPercent)
  )
    warnings.push("ROUNDED_TARGET");
  return {
    ...result,
    theoreticalRevenue: theoretical.toFixed(),
    warnings,
    contribution: contribution ?? result.contribution,
    afterDepreciation: afterDepreciation ?? result.afterDepreciation,
    contributionMargin: margin ?? result.contributionMargin,
    tax: { ...tax, contribution, afterDepreciation, margin },
  };
}
