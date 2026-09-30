import type { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import type {
  DocumentSnapshot,
  DocumentTotals,
  ReceiptSummary,
} from "@/domain/commerce/types";
import { civilDateToDb, todaySaoPaulo } from "@/domain/commerce/dates";
export async function createSaleReceivables(
  tx: Prisma.TransactionClient,
  saleId: string,
) {
  const sale = await tx.sale.findUniqueOrThrow({
    where: { id: saleId },
    include: { installments: true },
  });
  const snapshot = sale.snapshot as unknown as DocumentSnapshot;
  await tx.financialEntry.createMany({
    data: sale.installments.map((p) => ({
      kind: "RECEIVABLE",
      amount: p.amount,
      dueDate: p.dueDate,
      description: `VEN-${String(sale.sequence).padStart(6, "0")} · Parcela ${p.number}`,
      counterparty: snapshot.customer.name,
      customerId: sale.customerId,
      saleInstallmentId: p.id,
    })),
  });
}
export async function getSaleReceiptSummary(
  tx: Prisma.TransactionClient,
  saleId: string,
): Promise<ReceiptSummary> {
  const sale = await tx.sale.findUniqueOrThrow({ where: { id: saleId } });
  const entries = await tx.financialEntry.findMany({
    where: { saleInstallment: { saleId }, canceledAt: null },
  });
  const today = civilDateToDb(todaySaoPaulo(new Date()));
  return {
    total: (sale.totals as unknown as DocumentTotals).total,
    received: "0.00",
    pending: entries
      .reduce((a, e) => a.plus(e.amount.toString()), new Decimal(0))
      .toFixed(2),
    overdue: entries
      .filter((e) => e.dueDate < today)
      .reduce((a, e) => a.plus(e.amount.toString()), new Decimal(0))
      .toFixed(2),
  };
}
