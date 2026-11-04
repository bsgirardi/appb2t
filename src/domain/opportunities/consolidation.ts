import Decimal from "decimal.js";
import type { QuoteDraftInput } from "@/domain/commerce/types";
import type { DocumentCostsDTO } from "@/domain/pricing/types";
import { calculateDocumentTotals } from "@/domain/commerce/totals";
import { parseMoney } from "@/domain/commerce/validation";
import { allocate } from "@/domain/profitability/allocation";
import { quoteDecisionLines } from "./decision";

const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export function quoteConsolidation(
  input: QuoteDraftInput,
  costs: DocumentCostsDTO | null | undefined,
  declared: { shippingCost: string; shippingFees: string },
) {
  const result: {
    revenue: string | null;
    productFees: string | null;
    contribution: string | null;
    afterDepreciation: string | null;
    margin: string | null;
    covered: number;
    total: number;
    allocations: { key: string; value: string }[];
    error: string | null;
  } = {
    revenue: null,
    productFees: null,
    contribution: null,
    afterDepreciation: null,
    margin: null,
    covered: 0,
    total: input.items?.length ?? 0,
    allocations: [],
    error: null,
  };
  try {
    const items = input.items ?? [];
    const rows = quoteDecisionLines(items, costs);
    result.covered = rows.filter((row) => row.result).length;
    if (input.discount === undefined || input.shipping === undefined)
      throw new Error(
        "Complete os itens, o desconto e o frete cobrado no orçamento.",
      );
    const totals = calculateDocumentTotals(
      items,
      input.discount,
      input.shipping,
    );
    result.revenue = totals.total;
    if (!rows.length || result.covered !== rows.length)
      throw new Error(
        "Todos os itens precisam de memória de custo válida para consolidar.",
      );
    if (!declared.shippingCost.trim() || !declared.shippingFees.trim())
      throw new Error(
        "Declare o custo de envio e os encargos sobre o frete; informe zero somente quando confirmado.",
      );
    const shippingCost = parseMoney(declared.shippingCost);
    const shippingFees = parseMoney(declared.shippingFees);
    const weights = items.map((item, position) => ({
      key: item.lineId ?? `line:${position}`,
      position,
      weight: new D(parseMoney(item.unitPrice)).times(item.quantity).toFixed(),
    }));
    result.allocations = allocate(totals.discount, weights, 2);
    let variable = new D(0),
      depreciation = new D(0),
      fees = new D(0);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const net = new D(weights[i].weight).minus(result.allocations[i].value);
      const rate = row
        .snapshot!.input.channel.fees.reduce(
          (sum, fee) => sum.plus(fee.percent),
          new D(0),
        )
        .div(100);
      fees = fees.plus(net.times(rate));
      variable = variable.plus(row.result!.variableCost);
      depreciation = depreciation.plus(row.result!.depreciation);
    }
    const contribution = new D(totals.total)
      .minus(variable)
      .minus(fees)
      .minus(shippingCost)
      .minus(shippingFees);
    result.productFees = fees.toFixed(2);
    result.contribution = contribution.toFixed(2);
    result.afterDepreciation = contribution.minus(depreciation).toFixed(2);
    result.margin = new D(totals.total).isZero()
      ? null
      : contribution.div(totals.total).times(100).toFixed(2);
  } catch (error) {
    result.error =
      error instanceof Error
        ? error.message
        : "Confira as premissas da simulação.";
  }
  return result;
}
