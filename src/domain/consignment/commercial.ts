import { StockDecimal as D } from "@/domain/stock/quantities";
import { parseMoney, MONEY_MAX } from "@/domain/commerce/validation";
import { addMonthsClamped, parseCivilDate } from "@/domain/commerce/dates";
import { units } from "@/domain/production/quantities";
import { AppError } from "@/lib/errors";
import type { CommercialLineInput, CommercialTotals } from "./types";
export function commissionPercent(raw: string): string {
  if (typeof raw !== "string" || !/^\d{1,3}([.,]\d{1,4})?$/.test(raw.trim()))
    throw new AppError("VALIDATION", "Informe comissão de 0 a 100 com até quatro casas.");
  const value = new D(raw.trim().replace(",", "."));
  if (value.gt(100)) throw new AppError("VALIDATION", "Comissão deve estar entre 0 e 100.");
  return value.toFixed();
}
export function calculateConsignmentLines(input: CommercialLineInput[]): CommercialTotals {
  if (!input.length || input.length > 100 || new Set(input.map(l => l.model)).size !== 1)
    throw new AppError("VALIDATION", "Informe até 100 linhas com o mesmo modelo de comissão.");
  const model = input[0].model;
  if (!["RETIDA", "SEPARADA"].includes(model)) throw new AppError("VALIDATION", "Modelo inválido.");
  const lines = input.map(l => {
    units(l.quantity, true);
    const unitPrice = parseMoney(l.unitPrice, { positive: true }), percent = commissionPercent(l.percent);
    const gross = new D(unitPrice).times(l.quantity);
    if (gross.gt(MONEY_MAX)) throw new AppError("VALIDATION", "Valor excede o limite monetário.");
    const commission = gross.times(percent).div(100).toDecimalPlaces(2, D.ROUND_HALF_UP);
    return {...l, unitPrice, percent, gross:gross.toFixed(2), commission:commission.toFixed(2), net:gross.minus(commission).toFixed(2)};
  });
  const gross = lines.reduce((s,l) => s.plus(l.gross),new D(0)), commission = lines.reduce((s,l) => s.plus(l.commission),new D(0));
  if (gross.gt(MONEY_MAX)) throw new AppError("VALIDATION", "Total excede o limite monetário.");
  return {gross:gross.toFixed(2),commission:commission.toFixed(2),receivable:(model==="RETIDA"?gross.minus(commission):gross).toFixed(2),payable:(model==="SEPARADA"?commission:new D(0)).toFixed(2),lines};
}
export function consignmentDueDate(date: string, day: number): string {
  parseCivilDate(date);
  if (!Number.isInteger(day) || day<1 || day>28) throw new AppError("VALIDATION", "Vencimento deve estar entre os dias 1 e 28.");
  return parseCivilDate(addMonthsClamped(date,1).slice(0,8)+String(day).padStart(2,"0"));
}
