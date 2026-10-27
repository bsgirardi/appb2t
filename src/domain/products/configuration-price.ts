import Decimal from "decimal.js";
import { validateProductQuantity } from "./quantity";
import { quantityBasePrice, type QuantityTier } from "./quantity-pricing";
import {
  validateAnswers,
  type PriceMode,
  type ProductConfiguration,
  type ConfigurationAnswer,
} from "./configuration";
export type ConfiguredPrice =
  | { kind: "REFERENCE"; unit: string; subtotal: string }
  | { kind: "CONSULT"; unit: null; subtotal: null };
export function configuredPrice(input: {
  mode: PriceMode;
  basePrice: string | null;
  configuration: ProductConfiguration;
  answers: ConfigurationAnswer[];
  quantity: number;
  quantityTiers?: QuantityTier[];
  minimumQuantity?: number;
}): ConfiguredPrice {
  const quantity = validateProductQuantity(
    input.quantity,
    input.minimumQuantity,
  );
  const answers = validateAnswers(input.configuration, input.answers);
  const effects = answers.map((a) => {
    const f = input.configuration.fields.find((f) => f.id === a.fieldId)!;
    return f.type === "SINGLE_CHOICE"
      ? f.options.find((o) => o.id === a.value)!.effect
      : f.effect;
  });
  if (input.mode === "CONSULT" || effects.some((e) => e.kind === "CONSULT"))
    return { kind: "CONSULT", unit: null, subtotal: null };
  if (!input.basePrice || !/^\d{1,16}(\.\d{1,2})?$/.test(input.basePrice))
    throw new Error("Preço de referência inválido.");
  const base = new Decimal(
    quantityBasePrice(input.basePrice, quantity, input.quantityTiers ?? []),
  );
  if (base.lte(0)) throw new Error("Preço de referência inválido.");
  const unit = effects
    .reduce((sum, e) => (e.kind === "ADD" ? sum.plus(e.amount) : sum), base)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const subtotal = unit.times(quantity);
  if (unit.gt("9999999999999999.99") || subtotal.gt("9999999999999999.99"))
    throw new Error("O valor excede o limite permitido.");
  return {
    kind: "REFERENCE",
    unit: unit.toFixed(2),
    subtotal: subtotal.toFixed(2),
  };
}
