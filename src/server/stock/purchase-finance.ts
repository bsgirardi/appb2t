import { Prisma } from "@prisma/client";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { conflict, AppError } from "@/lib/errors";
import { confirmReceiptSchema } from "@/domain/stock/validation";
import { StockDecimal as D } from "@/domain/stock/quantities";
import { lockCommerce } from "@/server/commerce/locks";
import { createPurchasePayables } from "@/server/finance/entries";
import { runStockCommand, lockStockItems } from "./commands";
import { invalid } from "./movements";
import { revalueItem } from "./valuation";
export async function linkPurchasePayables(
  tx: Prisma.TransactionClient,
  receiptId: string,
  entryIds: string[],
): Promise<void> {
  for (const entryId of entryIds)
    await tx.receiptFinancialLink.create({ data: { receiptId, entryId } });
}
export async function confirmReceiptFinance(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const v = confirmReceiptSchema.parse(raw);
  return runStockCommand(actor, "CONFIRM_RECEIPT", v, async (tx) => {
    await tx.$queryRaw`SELECT id FROM "PurchaseReceipt" WHERE id=${v.receiptId} FOR UPDATE`;
    const receipt = await tx.purchaseReceipt.findUnique({
      where: { id: v.receiptId },
      include: { lines: true },
    });
    if (!receipt)
      throw new AppError("NOT_FOUND", "Recebimento não encontrado.");
    if (receipt.version !== v.expectedVersion || receipt.status !== "PENDING")
      throw conflict();
    await lockStockItems(
      tx,
      receipt.lines.map((l) => l.itemId),
    );
    if (
      v.lines.length !== receipt.lines.length ||
      new Set(v.lines.map((l) => l.id)).size !== v.lines.length ||
      v.lines.some((l) => !receipt.lines.some((r) => r.id === l.id))
    )
      invalid("Confira todas as linhas do recebimento.");
    if (!v.lines.reduce((n, l) => n.plus(l.value), new D(0)).eq(v.total))
      invalid("Valores das linhas devem fechar o total da compra.");
    let ids: string[];
    if (v.mode === "CREATE")
      ids = await createPurchasePayables(
        tx,
        actor,
        receipt.id,
        {
          kind: "PAYABLE",
          description: `Compra ${receipt.document || receipt.id}`,
          counterparty: receipt.supplier,
          categoryId: v.categoryId,
          amount: v.total,
          dueDate: v.installments[0].dueDate,
        },
        v.installments,
      );
    else {
      if (new Set(v.entryIds).size !== v.entryIds.length)
        invalid("Obrigação repetida.");
      await lockCommerce(tx, { entryIds: v.entryIds });
      const entries = await tx.financialEntry.findMany({
        where: { id: { in: v.entryIds } },
        include: { receiptLink: true },
      });
      if (
        entries.length !== v.entryIds.length ||
        entries.some(
          (e) =>
            e.kind !== "PAYABLE" ||
            e.canceledAt ||
            e.receiptLink ||
            e.saleInstallmentId ||
            e.counterparty.trim().toLocaleLowerCase("pt-BR") !==
              receipt.supplier.trim().toLocaleLowerCase("pt-BR"),
        )
      )
        invalid("Selecione contas a pagar compatíveis, sem vínculo anterior.");
      if (
        !entries
          .reduce((n, e) => n.plus(e.amount.toString()), new D(0))
          .eq(v.total)
      )
        invalid("O total das obrigações deve coincidir com a compra.");
      for (const groupId of new Set(
        entries.map((e) => e.groupId).filter((id): id is string => !!id),
      )) {
        const group = await tx.financialEntry.findMany({
          where: { groupId },
          select: { id: true },
        });
        if (group.some((e) => !v.entryIds.includes(e.id)))
          invalid("Vincule o grupo completo de parcelas.");
      }
      ids = v.entryIds;
      await linkPurchasePayables(tx, receipt.id, ids);
    }
    for (const line of v.lines)
      await tx.purchaseReceiptLine.update({
        where: { id: line.id },
        data: { confirmedValue: line.value },
      });
    await tx.purchaseReceipt.update({
      where: { id: receipt.id },
      data: {
        status: "CONFIRMED",
        total: v.total,
        confirmedAt: new Date(),
        confirmedById: actor.id,
        version: { increment: 1 },
      },
    });
    for (const itemId of new Set(receipt.lines.map((l) => l.itemId))) {
      await tx.stockItem.update({
        where: { id: itemId },
        data: { version: { increment: 1 } },
      });
      await revalueItem(tx, itemId);
    }
    return {
      id: receipt.id,
      status: "CONFIRMED",
      version: receipt.version + 1,
      total: v.total,
      entryIds: ids,
    };
  });
}
