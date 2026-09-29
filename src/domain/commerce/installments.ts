import Decimal from "decimal.js";
import { z } from "zod";
import { parseMoney, installmentSchema } from "./validation";
import { addMonthsClamped, parseCivilDate } from "./dates";
import type { InstallmentInput } from "./types";
import { AppError } from "@/lib/errors";
export function splitInstallments(
  total: string,
  count: number,
  firstDueDate: string,
): InstallmentInput[] {
  const cents = new Decimal(parseMoney(total, { positive: true })).times(100);
  parseCivilDate(firstDueDate);
  if (!Number.isInteger(count) || count < 1 || count > 120 || cents.lt(count))
    throw new AppError(
      "VALIDATION",
      "Informe de 1 a 120 parcelas, todas maiores que zero.",
    );
  const base = cents.dividedToIntegerBy(count),
    extra = cents.mod(count).toNumber();
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    amount: base
      .plus(i < extra ? 1 : 0)
      .div(100)
      .toFixed(2),
    dueDate: addMonthsClamped(firstDueDate, i),
  }));
}
export function validateInstallments(
  total: string,
  rows: InstallmentInput[],
): InstallmentInput[] {
  const valid = z.array(installmentSchema).min(1).max(120).parse(rows);
  if (
    valid.some((row, i) => row.number !== i + 1) ||
    !valid
      .reduce((sum, row) => sum.plus(row.amount), new Decimal(0))
      .eq(parseMoney(total, { positive: true }))
  )
    throw new AppError(
      "VALIDATION",
      "A soma das parcelas deve ser igual ao total, com numeração sequencial.",
    );
  return valid;
}
