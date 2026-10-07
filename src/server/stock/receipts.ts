import type { Actor } from "@/server/auth/session";
import { receiveSchema } from "@/domain/stock/validation";
import { civilDateToDb } from "@/domain/commerce/dates";
import { lockStockItems, runStockCommand } from "./commands";
import { requireStockItem } from "./catalog";
import { postMovement, checkDate, invalid } from "./movements";
export async function receivePurchase(actor: Actor, raw: unknown) {
  const v = receiveSchema.parse(raw);
  checkDate(v.effectiveDate, v.reason);
  if (v.expectedVersion !== 0)
    invalid("Recebimento já existente deve ser conferido.");
  return runStockCommand(actor, "RECEIPT", v, async (tx) => {
    await lockStockItems(
      tx,
      v.lines.map((l) => l.itemId),
    );
    const receipt = await tx.purchaseReceipt.create({
      data: {
        supplier: v.supplier,
        document: v.document,
        actorId: actor.id,
        effectiveDate: civilDateToDb(v.effectiveDate),
      },
    });
    const lines = [];
    for (const line of v.lines) {
      const item = await requireStockItem(tx, line.itemId);
      const saved = await tx.purchaseReceiptLine.create({
        data: {
          receiptId: receipt.id,
          itemId: item.id,
          quantity: line.quantity,
        },
      });
      await postMovement(tx, actor, {
        ...v,
        ...line,
        kind: "RECEIPT",
        expectedVersion: item.version,
        receiptLineId: saved.id,
      });
      lines.push({
        id: saved.id,
        itemId: item.id,
        quantity: saved.quantity.toFixed(),
      });
    }
    return {
      id: receipt.id,
      version: receipt.version,
      supplier: receipt.supplier,
      document: receipt.document,
      status: receipt.status,
      lines,
    };
  });
}
