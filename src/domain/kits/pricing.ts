import DecimalJS from "decimal.js";
import { z } from "zod";
import type { ConfiguredPrice } from "@/domain/products/configuration-price";
import { positiveCatalogMoney } from "@/domain/products/quantity-pricing";
import { kitDiscountTiersSchema } from "./validation";
import type { KitDiscountTier, KitPrice } from "./types";
const Decimal = DecimalJS.clone({
  precision: 40,
  rounding: DecimalJS.ROUND_HALF_UP,
});
const maxMoney = new Decimal("9999999999999999.99");
export function calculateKitPrice(
  lines: { quantity: number; price: ConfiguredPrice }[],
  tiers: KitDiscountTier[],
): KitPrice {
  z.array(z.unknown()).min(1).max(20).parse(lines);
  const rules = kitDiscountTiersSchema.parse(tiers);
  let quantity = 0,
    known = new Decimal(0),
    consult = false;
  for (const line of lines) {
    quantity += z.number().int().min(1).max(99).parse(line.quantity);
    if (line.price.kind === "CONSULT") {
      if (line.price.unit !== null || line.price.subtotal !== null)
        throw new Error("Valor sob consulta inválido.");
      consult = true;
      continue;
    }
    const unit = new Decimal(positiveCatalogMoney.parse(line.price.unit));
    const subtotal = new Decimal(
      positiveCatalogMoney.parse(line.price.subtotal),
    );
    if (!subtotal.eq(unit.times(line.quantity)))
      throw new Error("Subtotal do componente inválido.");
    known = known.plus(subtotal);
    if (known.gt(maxMoney))
      throw new Error("O valor excede o limite permitido.");
  }
  const tier =
    rules
      .filter((t) => t.minQuantity <= quantity)
      .sort((a, b) => b.minQuantity - a.minQuantity)[0] ?? null;
  if (consult)
    return {
      kind: "CONSULT",
      quantity,
      knownSubtotal: known.toFixed(2),
      subtotal: null,
      discount: null,
      total: null,
      tier,
    };
  const discount = !tier
    ? new Decimal(0)
    : tier.kind === "FIXED"
      ? new Decimal(tier.amount)
      : known
          .times(tier.percent)
          .div(100)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  if (discount.gte(known))
    throw new Error(
      "O desconto deve ser menor que a soma dos componentes. Revise o kit.",
    );
  return {
    kind: "REFERENCE",
    quantity,
    knownSubtotal: known.toFixed(2),
    subtotal: known.toFixed(2),
    discount: discount.toFixed(2),
    total: known.minus(discount).toFixed(2),
    tier,
  };
}
