import { StockDecimal as D } from "@/domain/stock/quantities";
import { addMonthsClamped, parseCivilDate } from "@/domain/commerce/dates";
import { AppError } from "@/lib/errors";
export function competenceRange(raw: string) {
  if (!/^\d{4}-\d{2}$/.test(raw))
    throw new AppError("VALIDATION", "Informe competência no formato AAAA-MM.");
  const from = parseCivilDate(raw + "-01");
  return { from, until: addMonthsClamped(from, 1) };
}
export function statementState(
  links: { amount: string; settled: string }[],
  canceled: boolean,
) {
  if (canceled) return "CANCELADO";
  if (links.every((l) => new D(l.settled).eq(l.amount))) return "QUITADO";
  if (links.some((l) => new D(l.settled).gt(0))) return "PARCIAL";
  return "FECHADO_PENDENTE";
}
