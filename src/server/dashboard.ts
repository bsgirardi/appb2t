import DecimalJS from "decimal.js";
import { db } from "@/lib/db";
import type { Actor } from "./auth/session";
import { todaySaoPaulo, civilDateToDb } from "@/domain/commerce/dates";
import { getFinanceDashboard } from "./finance/reports";
const Decimal = DecimalJS.clone({
  precision: 40,
  rounding: DecimalJS.ROUND_HALF_UP,
});

export async function getDashboard(actor: Actor, now = new Date()) {
  const today = todaySaoPaulo(now),
    month = today.slice(0, 7);
  const [year, number] = month.split("-").map(Number);
  const next =
    number === 12
      ? `${year + 1}-01`
      : `${year}-${String(number + 1).padStart(2, "0")}`;
  const [operations, finance] = await Promise.all([
    db.$transaction(
      async (tx) => {
        const active = { status: { in: ["LIBERADA", "EM_EXECUCAO"] } };
        const [sales, quotes, production, overdueProduction, readySales] =
          await Promise.all([
            tx.sale.findMany({
              where: {
                status: { notIn: ["RASCUNHO", "CANCELADA"] },
                createdAt: {
                  gte: new Date(`${month}-01T00:00:00-03:00`),
                  lt: new Date(`${next}-01T00:00:00-03:00`),
                },
              },
              select: { totals: true },
            }),
            tx.quote.count({
              where: {
                OR: [
                  { status: "RASCUNHO" },
                  {
                    status: { in: ["ENVIADO", "APROVADO"] },
                    validUntil: { gte: civilDateToDb(today) },
                  },
                ],
              },
            }),
            tx.productionOrder.count({ where: active }),
            tx.productionOrder.count({
              where: { ...active, dueDate: { lt: civilDateToDb(today) } },
            }),
            tx.sale.count({ where: { status: "PRONTA" } }),
          ]);
        return {
          salesCount: sales.length,
          salesValue: sales
            .reduce(
              (sum, sale) => sum.plus((sale.totals as { total: string }).total),
              new Decimal(0),
            )
            .toFixed(2),
          quotes,
          production,
          overdueProduction,
          readySales,
        };
      },
      { isolationLevel: "RepeatableRead" },
    ),
    actor.role === "ADMIN" ? getFinanceDashboard(actor) : Promise.resolve(null),
  ]);
  return { ...operations, finance, today, month };
}
