import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { correctionSchema } from "@/domain/stock/validation";
import { StockDecimal as D } from "@/domain/stock/quantities";
import { runStockCommand, lockStockItems } from "./commands";
import { postMovement, invalid } from "./movements";
export async function correctStock(actor: Actor, raw: unknown) {
  const v = correctionSchema.parse(raw);
  if (v.kind === "RETURN_SUPPLIER") assertAdmin(actor);
  const pre = await db.stockMovement.findUnique({
    where: { id: v.sourceId },
    include: { receiptLine: true },
  });
  if (!pre)
    throw new AppError("NOT_FOUND", "Movimento de origem não encontrado.");
  return runStockCommand(actor, "CORRECTION", v, async (tx) => {
    if (pre.receiptLine)
      await tx.$queryRaw`SELECT id FROM "PurchaseReceipt" WHERE id=${pre.receiptLine.receiptId} FOR UPDATE`;
    await lockStockItems(tx, [pre.itemId]);
    const source = await tx.stockMovement.findUniqueOrThrow({
      where: { id: pre.id },
    });
    if (
      source.kind !==
      (v.kind === "RETURN_CONSUMPTION" ? "CONSUMPTION" : "RECEIPT")
    )
      invalid("Origem incompatível com a devolução.");
    const returned =
      (
        await tx.stockMovement.aggregate({
          where: { sourceId: source.id, kind: v.kind },
          _sum: { quantity: true },
        })
      )._sum.quantity?.abs() ?? new D(0);
    if (
      new D(returned.toString())
        .plus(v.quantity)
        .gt(source.quantity.abs().toString())
    )
      invalid("Devolução excede a quantidade líquida da origem.");
    const result = await postMovement(tx, actor, {
      ...v,
      itemId: source.itemId,
    });
    if (pre.receiptLine)
      await tx.purchaseReceipt.update({
        where: { id: pre.receiptLine.receiptId },
        data: { version: { increment: 1 } },
      });
    return result;
  });
}
import { z } from "zod";
import { commandMeta } from "@/domain/stock/validation";
import { conflict } from "@/lib/errors";
import { civilDateToDb, todaySaoPaulo } from "@/domain/commerce/dates";
import { lockCommerce } from "../commerce/locks";
import { entryRow, entryDTO } from "../finance/entries";
import { audit } from "../finance/audit";
import { revalueItem } from "./valuation";
import { balance } from "./movements";
const cancelSchema = z
  .object({
    ...commandMeta,
    receiptId: z.string(),
    reason: z.string().trim().min(3).max(2000),
  })
  .strict();
export async function cancelReceipt(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const v = cancelSchema.parse(raw);
  return runStockCommand(actor, "CANCEL_RECEIPT", v, async (tx) => {
    await tx.$queryRaw`SELECT id FROM "PurchaseReceipt" WHERE id=${v.receiptId} FOR UPDATE`;
    const r = await tx.purchaseReceipt.findUnique({
      where: { id: v.receiptId },
      include: {
        lines: { include: { movement: { include: { allocations: true } } } },
        entries: true,
      },
    });
    if (!r) throw new AppError("NOT_FOUND", "Recebimento não encontrado.");
    if (r.version !== v.expectedVersion || r.status === "CANCELED")
      throw conflict();
    const itemIds = [...new Set(r.lines.map((l) => l.itemId))];
    await lockStockItems(tx, itemIds);
    await lockCommerce(tx, { entryIds: r.entries.map((e) => e.entryId) });
    for (const link of r.entries) {
      if (new D(entryDTO(await entryRow(tx, link.entryId)).paidAmount).gt(0))
        invalid("Estorne as baixas antes de cancelar o recebimento.");
    }
    for (const itemId of itemIds) {
      const lines = r.lines.filter((l) => l.itemId === itemId);
      const first = Math.min(...lines.map((l) => l.movement!.sequence));
      const later = await tx.stockMovement.count({
        where: {
          itemId,
          sequence: { gt: first },
          id: { notIn: lines.map((l) => l.movement!.id) },
        },
      });
      if (later)
        invalid(
          "Há movimentos posteriores dependentes. Use devolução ou ajuste referenciado.",
        );
      const q = lines.reduce((s, l) => s.plus(l.quantity.toString()), new D(0));
      if (new D((await balance(tx, itemId)).available).minus(q).lt(0))
        invalid("Libere as reservas dependentes antes de cancelar.");
    }
    for (const line of r.lines) {
      const m = line.movement!;
      await tx.stockMovement.create({
        data: {
          itemId: line.itemId,
          kind: "COMPENSATION_OUT",
          quantity: m.quantity.negated(),
          method: m.method,
          manualUnitCost: m.manualUnitCost,
          sourceId: m.id,
          actorId: actor.id,
          reason: v.reason,
          effectiveDate: civilDateToDb(todaySaoPaulo(new Date())),
          allocations: {
            create: m.allocations.map((a) => ({
              identityId: a.identityId,
              quantity: a.quantity.negated(),
            })),
          },
        },
      });
    }
    for (const link of r.entries) {
      await tx.financialEntry.update({
        where: { id: link.entryId },
        data: { canceledAt: new Date(), version: { increment: 1 } },
      });
      await audit(
        tx,
        actor,
        "ENTRY",
        link.entryId,
        "CANCEL",
        { receiptId: r.id },
        v.reason,
      );
    }
    await tx.purchaseReceipt.update({
      where: { id: r.id },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        version: { increment: 1 },
      },
    });
    for (const itemId of itemIds) {
      await tx.stockItem.update({
        where: { id: itemId },
        data: { version: { increment: 1 } },
      });
      await revalueItem(tx, itemId);
    }
    return { id: r.id, status: "CANCELED", version: r.version + 1 };
  });
}
import { moneySchema } from "@/domain/commerce/validation";
const returnFinanceSchema = z
  .object({
    ...commandMeta,
    movementId: z.string(),
    mode: z.enum(["KEEP", "REDUCE"]),
    reason: z.string().trim().min(3).max(2000),
    entries: z
      .array(z.object({ id: z.string(), amount: moneySchema }).strict())
      .max(120)
      .default([]),
  })
  .strict();
export async function resolveReturnFinance(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const v = returnFinanceSchema.parse(raw);
  const pre = await db.stockMovement.findUnique({
    where: { id: v.movementId },
    include: { source: { include: { receiptLine: true } } },
  });
  if (pre?.kind !== "RETURN_SUPPLIER" || !pre.source?.receiptLine)
    invalid("Devolução de compra não encontrada.");
  const receiptId = pre!.source!.receiptLine!.receiptId;
  return runStockCommand(actor, "RETURN_FINANCE", v, async (tx) => {
    await tx.$queryRaw`SELECT id FROM "PurchaseReceipt" WHERE id=${receiptId} FOR UPDATE`;
    const receipt = await tx.purchaseReceipt.findUniqueOrThrow({
      where: { id: receiptId },
      include: { entries: true },
    });
    if (receipt.version !== v.expectedVersion) throw conflict();
    if (
      await tx.stockCommand.findFirst({
        where: {
          type: "RETURN_FINANCE",
          result: { path: ["movementId"], equals: v.movementId },
        },
      })
    )
      throw conflict();
    if (receipt.status !== "CONFIRMED")
      invalid("Confirme a compra antes de resolver sua devolução financeira.");
    await lockCommerce(tx, { entryIds: receipt.entries.map((e) => e.entryId) });
    if (v.mode === "KEEP" && v.entries.length)
      invalid("Manter obrigação não recebe novos valores.");
    if (v.mode === "REDUCE") {
      if (
        !v.entries.length ||
        new Set(v.entries.map((e) => e.id)).size !== v.entries.length
      )
        invalid("Selecione parcelas distintas para ajuste.");
      for (const change of v.entries) {
        if (!receipt.entries.some((e) => e.entryId === change.id))
          invalid("Parcela não pertence à compra.");
        const row = await entryRow(tx, change.id);
        if (row.canceledAt || new D(entryDTO(row).paidAmount).gt(0))
          invalid(
            "Estorne as baixas da parcela antes de reduzir seu principal.",
          );
        if (new D(change.amount).gte(row.amount.toString()))
          invalid("O novo principal deve ser menor que o atual.");
        await tx.financialEntry.update({
          where: { id: row.id },
          data: new D(change.amount).isZero()
            ? { canceledAt: new Date(), version: { increment: 1 } }
            : { amount: change.amount, version: { increment: 1 } },
        });
        await audit(
          tx,
          actor,
          "ENTRY",
          row.id,
          "STOCK_RETURN",
          {
            previous: row.amount.toFixed(2),
            current: change.amount,
            movementId: v.movementId,
          },
          v.reason,
        );
      }
    }
    await tx.purchaseReceipt.update({
      where: { id: receiptId },
      data: { version: { increment: 1 } },
    });
    return {
      receiptId,
      movementId: v.movementId,
      mode: v.mode,
      reason: v.reason,
      entries: v.entries,
      version: receipt.version + 1,
    };
  });
}
