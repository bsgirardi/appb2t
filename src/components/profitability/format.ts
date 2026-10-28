import { StockDecimal as D } from "@/domain/stock/quantities";

export const coverageNames = {
  UNAVAILABLE: "Indisponível",
  PARTIAL: "Parcial",
  PROVISIONAL: "Provisório",
  COMPLETE: "Completo",
};
export function moneyText(v: string | null) {
  if (v === null) return "Indisponível";
  const [whole, fraction] = new D(v).toFixed(2).split(".");
  return `R$ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${fraction}`;
}
