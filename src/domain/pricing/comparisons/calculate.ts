import Decimal from "decimal.js";
import { calculatePricing } from "../calculate-fiscal";
import { pricingV2Schema } from "../validation";
import type { PricingChannelDTO, PricingV2Input } from "../types";
import type {
  ComparisonAlternative,
  ComparisonPreview,
  ComparisonReference,
} from "./types";
import {
  comparisonAlternativesSchema,
  comparisonReferenceSchema,
} from "./validation";
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
const ceil = (v: Decimal) => {
  if (!v.isFinite() || v.abs().gt("9999999999999999.99"))
    throw Error("O resultado excede o limite monetário permitido.");
  return v.toDecimalPlaces(2, Decimal.ROUND_CEIL).toFixed(2);
};
export function previewComparison(
  input: PricingV2Input,
  channels: PricingChannelDTO[],
  rawReference: ComparisonReference,
  rawAlternatives: ComparisonAlternative[],
): ComparisonPreview {
  const reference = comparisonReferenceSchema.parse(rawReference);
  const alternatives = comparisonAlternativesSchema.parse(rawAlternatives);
  return {
    alternatives: alternatives.map((a) => {
      try {
        const channel = channels.find(
          (c) =>
            c.id === a.channelRef.id &&
            c.version === a.channelRef.version &&
            c.active,
        );
        if (!channel)
          throw Error(
            "Canal indisponível ou alterado. Revise os parâmetros atuais.",
          );
        const offerInput = pricingV2Schema.parse({
          ...input,
          channel: {
            ref: a.channelRef,
            name: channel.name,
            fees: channel.fees,
            fixedCost: channel.fixedCost,
          },
          mode: "INFORMED",
          informedUnitPrice: "0",
        });
        const costs = calculatePricing(offerInput);
        const base =
          reference.kind === "COMMON"
            ? reference.unitPrice
            : calculatePricing({
                ...offerInput,
                mode: input.mode,
                informedUnitPrice: input.informedUnitPrice,
              }).offeredUnitPrice;
        const final = new D(base)
          .times(new D(1).minus(new D(a.discountPercent).div(100)))
          .toDecimalPlaces(2)
          .toFixed(2);
        const result = calculatePricing({
          ...offerInput,
          informedUnitPrice: final,
        });
        const before = calculatePricing({
          ...offerInput,
          informedUnitPrice: base,
        });
        const rate = offerInput.channel.fees
          .reduce((s, f) => s.plus(f.percent), new D(0))
          .div(100);
        const fiscalRate =
          costs.tax?.amount != null &&
          offerInput.tax?.profile?.regime === "SIMPLES"
            ? new D(offerInput.tax.profile.percent!).div(100)
            : new D(0);
        const combinedRate = rate.plus(fiscalRate);
        if (combinedRate.gte(1))
          throw Error(
            "Cobertura impossível: taxas e tributo somam 100% ou mais. O preço informado continua uma decisão comercial.",
          );
        const target = new D(offerInput.targetMarginPercent).div(100);
        // The continuous formula is only a starting point: tax rounds per line.
        const refine = (start: string, margin: Decimal | null) => {
          if (fiscalRate.isZero()) return start;
          let price = start;
          const slope = new D(offerInput.quantity).times(
            new D(1).minus(combinedRate).minus(margin ?? 0),
          );
          for (let attempt = 0; attempt < 32; attempt++) {
            const exact = calculatePricing({
              ...offerInput,
              informedUnitPrice: price,
            });
            const deficit =
              margin === null
                ? new D(exact.afterDepreciation).negated()
                : new D(exact.offeredRevenue)
                    .times(margin)
                    .minus(exact.contribution);
            if (deficit.lte(0)) return price;
            price = ceil(new D(price).plus(D.max("0.01", deficit.div(slope))));
          }
          throw Error(
            "Não foi possível determinar um preço de cobertura seguro com estes parâmetros e arredondamentos.",
          );
        };
        const coverageUnitPrice = refine(
          ceil(
            new D(costs.fullCost).div(
              new D(offerInput.quantity).times(new D(1).minus(combinedRate)),
            ),
          ),
          null,
        );
        const possible = combinedRate.plus(target).lt(1);
        const targetUnitPrice = possible
          ? refine(
              ceil(
                new D(costs.variableCost).div(
                  new D(offerInput.quantity).times(
                    new D(1).minus(combinedRate).minus(target),
                  ),
                ),
              ),
              target,
            )
          : null;
        return {
          status: "VALID" as const,
          value: {
            ...a,
            input: { ...offerInput, informedUnitPrice: final },
            result,
            metrics: {
              coverageUnitPrice,
              targetUnitPrice,
              requiredUnitPrice:
                targetUnitPrice === null
                  ? null
                  : D.max(coverageUnitPrice, targetUnitPrice).toFixed(2),
              targetUnavailableReason: possible
                ? null
                : "Taxas e meta somam 100% ou mais.",
              coversFullCost: new D(result.afterDepreciation).gte(0),
              meetsTarget:
                possible &&
                result.contributionMargin !== null &&
                new D(result.contributionMargin).gte(
                  offerInput.targetMarginPercent,
                ),
              referenceUnitPrice: new D(base).toFixed(2),
              finalUnitPrice: final,
              discountAmount: new D(before.offeredRevenue)
                .minus(result.offeredRevenue)
                .toFixed(),
              contributionChange: new D(result.contribution)
                .minus(before.contribution)
                .toFixed(),
              marginChangePoints:
                result.contributionMargin === null ||
                before.contributionMargin === null
                  ? null
                  : new D(result.contributionMargin)
                      .minus(before.contributionMargin)
                      .toFixed(),
            },
          },
        };
      } catch (e) {
        return {
          status: "INVALID" as const,
          ...a,
          message:
            e instanceof Error
              ? e.message
              : "Não foi possível comparar esta oferta.",
        };
      }
    }),
  };
}
