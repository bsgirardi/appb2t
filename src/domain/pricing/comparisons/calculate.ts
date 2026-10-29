import Decimal from "decimal.js";
import { calculateV2 } from "../calculate";
import { pricingV2Schema } from "../validation";
import type { PricingChannelDTO, PricingV2Input } from "../types";
import type { ComparisonAlternative, ComparisonPreview, ComparisonReference } from "./types";
import { comparisonAlternativesSchema, comparisonReferenceSchema } from "./validation";
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
const ceil = (v: Decimal) => {
  if (!v.isFinite() || v.abs().gt("9999999999999999.99")) throw Error("O resultado excede o limite monetário permitido.");
  return v.toDecimalPlaces(2, Decimal.ROUND_CEIL).toFixed(2);
};
export function previewComparison(input: PricingV2Input, channels: PricingChannelDTO[], rawReference: ComparisonReference, rawAlternatives: ComparisonAlternative[]): ComparisonPreview {
  const reference = comparisonReferenceSchema.parse(rawReference);
  const alternatives = comparisonAlternativesSchema.parse(rawAlternatives);
  return { alternatives: alternatives.map(a => {
    try {
      const channel = channels.find(c => c.id === a.channelRef.id && c.version === a.channelRef.version && c.active);
      if (!channel) throw Error("Canal indisponível ou alterado. Revise os parâmetros atuais.");
      const offerInput = pricingV2Schema.parse({ ...input, channel: { ref: a.channelRef, name: channel.name, fees: channel.fees, fixedCost: channel.fixedCost }, mode: "INFORMED", informedUnitPrice: "0" });
      const costs = calculateV2(offerInput);
      const base = reference.kind === "COMMON" ? reference.unitPrice : calculateV2({ ...offerInput, mode: input.mode, informedUnitPrice: input.informedUnitPrice }).offeredUnitPrice;
      const final = new D(base).times(new D(1).minus(new D(a.discountPercent).div(100))).toDecimalPlaces(2).toFixed(2);
      const result = calculateV2({ ...offerInput, informedUnitPrice: final });
      const before = calculateV2({ ...offerInput, informedUnitPrice: base });
      const rate = offerInput.channel.fees.reduce((s, f) => s.plus(f.percent), new D(0)).div(100);
      const target = new D(offerInput.targetMarginPercent).div(100);
      const coverageUnitPrice = ceil(new D(costs.fullCost).div(new D(offerInput.quantity).times(new D(1).minus(rate))));
      const possible = rate.plus(target).lt(1);
      const targetUnitPrice = possible ? ceil(new D(costs.variableCost).div(new D(offerInput.quantity).times(new D(1).minus(rate).minus(target)))) : null;
      return { status: "VALID" as const, value: { ...a, input: { ...offerInput, informedUnitPrice: final }, result, metrics: {
        coverageUnitPrice, targetUnitPrice, requiredUnitPrice: targetUnitPrice === null ? null : D.max(coverageUnitPrice, targetUnitPrice).toFixed(2),
        targetUnavailableReason: possible ? null : "Taxas e meta somam 100% ou mais.",
        coversFullCost: new D(result.afterDepreciation).gte(0),
        meetsTarget: possible && result.contributionMargin !== null && new D(result.contributionMargin).gte(offerInput.targetMarginPercent),
        referenceUnitPrice: new D(base).toFixed(2), finalUnitPrice: final,
        discountAmount: new D(before.offeredRevenue).minus(result.offeredRevenue).toFixed(),
        contributionChange: new D(result.contribution).minus(before.contribution).toFixed(),
        marginChangePoints: result.contributionMargin === null || before.contributionMargin === null ? null : new D(result.contributionMargin).minus(before.contributionMargin).toFixed(),
      } } };
    } catch (e) {
      return { status: "INVALID" as const, ...a, message: e instanceof Error ? e.message : "Não foi possível comparar esta oferta." };
    }
  }) };
}
