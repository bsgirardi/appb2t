import Decimal from "decimal.js";
import { z } from "zod";
import type { DocumentItemInput, DocumentTotals } from "./types";
import { itemSchema, parseMoney } from "./validation";
import { AppError } from "@/lib/errors";
export function calculateDocumentTotals(
  items: DocumentItemInput[],
  discount: string,
  shipping: string,
): DocumentTotals {
  const rows = z.array(itemSchema).min(1).max(100).parse(items);
  const sub = rows.reduce(
    (sum, item) => sum.plus(new Decimal(item.unitPrice).times(item.quantity)),
    new Decimal(0),
  );
  const d = new Decimal(parseMoney(discount)),
    s = new Decimal(parseMoney(shipping));
  if (d.gt(sub))
    throw new AppError("VALIDATION", "O desconto não pode superar o subtotal.");
  return {
    subtotal: parseMoney(sub.toFixed(2)),
    discount: d.toFixed(2),
    shipping: s.toFixed(2),
    total: parseMoney(sub.minus(d).plus(s).toFixed(2), { positive: true }),
  };
}
