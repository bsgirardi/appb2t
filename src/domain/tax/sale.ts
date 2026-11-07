import Decimal from "decimal.js";
import { allocate } from "@/domain/profitability/allocation";
import { calculateTax } from "./calculate";
import type { TaxPremise } from "./types";
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export interface TaxSaleLine {
  key: string;
  position: number;
  gross: string;
  tax?: TaxPremise;
}
export function assessSaleTax(
  lines: TaxSaleLine[],
  discount: string,
  shipping: string,
  competence: string | null,
) {
  const discounts = allocate(
    discount,
    lines.map((l) => ({ key: l.key, position: l.position, weight: l.gross })),
    2,
  );
  const rows = lines.map((l, i) => {
    const base = new D(l.gross).minus(discounts[i].value).toFixed(2);
    const amount = calculateTax(
      base,
      competence ? l.tax : undefined,
      competence ?? undefined,
    );
    return {
      key: l.key,
      profileId: l.tax?.profile?.id ?? null,
      premise: l.tax ?? null,
      ...amount,
    };
  });
  const known = rows.reduce((sum, r) => sum.plus(r.amount ?? 0), new D(0));
  const missing = rows.filter((r) => r.amount === null);
  return {
    knownAmount: known.toFixed(2),
    complete:
      missing.length === 0 && new D(shipping).isZero() && competence !== null,
    uncoveredBase: missing
      .reduce((sum, r) => sum.plus(r.base), new D(shipping))
      .toFixed(2),
    reasons: [
      ...new Set([
        ...missing.flatMap((r) => r.reasons),
        ...(new D(shipping).gt(0)
          ? ["Frete cobrado fora do recorte fiscal."]
          : []),
        ...(!competence
          ? ["Competência da confirmação não identificada."]
          : []),
      ]),
    ],
    lines: rows,
  };
}
export type SaleTaxAssessment = ReturnType<typeof assessSaleTax>;
