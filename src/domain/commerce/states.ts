import type { QuoteStatus, SaleStatus } from "./types";
import { AppError } from "@/lib/errors";
export function effectiveQuoteStatus(
  status: QuoteStatus,
  validUntil: string,
  today: string,
): QuoteStatus {
  return ["ENVIADO", "APROVADO"].includes(status) && validUntil < today
    ? "EXPIRADO"
    : status;
}
export function assertSaleTransition(from: SaleStatus, to: SaleStatus): void {
  const next: Partial<Record<SaleStatus, SaleStatus>> = {
    RASCUNHO: "CONFIRMADA",
    CONFIRMADA: "EM_PRODUCAO",
    EM_PRODUCAO: "PRONTA",
    PRONTA: "ENTREGUE",
  };
  if (
    next[from] === to ||
    (to === "CANCELADA" &&
      ["RASCUNHO", "CONFIRMADA", "EM_PRODUCAO", "PRONTA"].includes(from))
  )
    return;
  throw new AppError("VALIDATION", "Transição de venda inválida.");
}
