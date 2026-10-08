import type { SaleStatus } from "@/domain/commerce/types";
import { demandRemaining } from "./quantities";
export function projectSaleStatus(
  lines: { sold: number; delivered: number; ready: number; started: boolean }[],
): SaleStatus {
  for (const l of lines) demandRemaining(l.sold, l.delivered, l.ready, 0);
  if (!lines.length) return "CONFIRMADA";
  if (lines.every((l) => l.delivered === l.sold)) return "ENTREGUE";
  if (lines.every((l) => l.delivered + l.ready === l.sold)) return "PRONTA";
  if (lines.some((l) => l.started || l.delivered > 0 || l.ready > 0))
    return "EM_PRODUCAO";
  return "CONFIRMADA";
}
