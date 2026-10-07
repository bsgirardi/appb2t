import { readValuation, revalueItem } from "./valuation";
import { Prisma, type StockItem } from "@prisma/client";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import {
  itemSchema,
  openingSchema,
  identitySchema,
} from "@/domain/stock/validation";
import { StockDecimal as D, toBaseQuantity } from "@/domain/stock/quantities";
import { civilDateToDb, todaySaoPaulo } from "@/domain/commerce/dates";
import { runStockCommand, lockStockItems } from "./commands";
import { lockOperation } from "../commerce/locks";
const invalid = (message: string): never => {
  throw new AppError("VALIDATION", message);
};
export const itemDTO = (r: StockItem) => ({
  ...r,
  manualUnitCost: r.manualUnitCost?.toFixed() ?? null,
  inventoriedAt: r.inventoriedAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});
export async function requireStockItem(
  tx: Prisma.TransactionClient,
  id: string,
) {
  const row = await tx.stockItem.findUnique({ where: { id } });
  if (!row) throw new AppError("NOT_FOUND", "Item de estoque não encontrado.");
  return row;
}
export async function saveStockIdentity(actor: Actor, raw: unknown) {
  const v = identitySchema.parse(raw);
  return runStockCommand(actor, "IDENTITY", v, async (tx) => {
    await lockStockItems(tx, [v.itemId]);
    const item = await requireStockItem(tx, v.itemId);
    if (item.version !== v.expectedVersion) throw conflict();
    if (!item.active) invalid("Item inativo.");
    if (
      await tx.stockIdentity.findFirst({
        where: { itemId: item.id, label: v.label },
      })
    )
      invalid("Já existe uma identificação com esse nome.");
    const identity = await tx.stockIdentity.create({
      data: { itemId: item.id, label: v.label },
    });
    await tx.stockItem.update({
      where: { id: item.id },
      data: { version: { increment: 1 } },
    });
    return { id: identity.id, itemId: identity.itemId, label: identity.label };
  });
}
export async function saveStockItem(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const v = itemSchema.parse(raw);
  return runStockCommand(actor, "ITEM", v, async (tx) => {
    await lockOperation(tx, "stock:catalog");
    if (v.id) await lockStockItems(tx, [v.id]);
    const old = v.id ? await requireStockItem(tx, v.id) : null;
    if (old ? old.version !== v.expectedVersion : v.expectedVersion !== 0)
      throw conflict();
    if (
      (v.materialId || v.extraId) &&
      (await tx.stockItem.findFirst({
        where: {
          id: { not: v.id ?? "" },
          OR: [
            ...(v.materialId ? [{ materialId: v.materialId }] : []),
            ...(v.extraId ? [{ extraId: v.extraId }] : []),
          ],
        },
      }))
    )
      invalid("Este material ou complemento já possui controle de estoque.");
    if (v.materialId) {
      const m = await tx.material.findUnique({ where: { id: v.materialId } });
      if (!m?.active || v.unit !== (m.technology === "FDM" ? "G" : "ML"))
        invalid("Selecione material ativo com unidade compatível.");
    }
    if (
      v.extraId &&
      !(await tx.pricingExtra.findFirst({
        where: { id: v.extraId, active: true },
      }))
    )
      invalid("Selecione um complemento ativo.");
    if (
      old?.inventoriedAt &&
      (old.unit !== v.unit ||
        old.materialId !== (v.materialId ?? null) ||
        old.extraId !== (v.extraId ?? null))
    )
      invalid("Unidade e vínculo não podem mudar após inventário.");
    if (
      old?.inventoriedAt &&
      (old.method !== v.method ||
        (v.method === "MANUAL" &&
          old.manualUnitCost?.toFixed() !== v.manualUnitCost))
    ) {
      const current = await readValuation(tx, old.id);
      if (new D(current.physical).lt(0) || current.provisional)
        invalid(
          "Regularize déficits e custos pendentes antes de mudar a referência.",
        );
      if (!v.reason || v.manualUnitCost == null)
        invalid("Informe motivo e custo unitário de abertura.");
      await tx.stockMovement.create({
        data: {
          itemId: old.id,
          kind: "REVALUE",
          quantity: "0",
          method: v.method,
          manualUnitCost: v.manualUnitCost,
          actorId: actor.id,
          reason: v.reason!,
          effectiveDate: civilDateToDb(todaySaoPaulo(new Date())),
        },
      });
      await revalueItem(tx, old.id);
    }
    const { id, operationKey, expectedVersion, reason, ...data } = v;
    void operationKey;
    void expectedVersion;
    void reason;
    const row = id
      ? await tx.stockItem.update({
          where: { id },
          data: {
            ...data,
            materialId: data.materialId ?? null,
            extraId: data.extraId ?? null,
            version: { increment: 1 },
          },
        })
      : await tx.stockItem.create({ data });
    return itemDTO(row);
  });
}
export async function openInventory(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const v = openingSchema.parse(raw);
  return runStockCommand(actor, "OPENING", v, async (tx) => {
    await lockStockItems(tx, [v.itemId]);
    const item = await requireStockItem(tx, v.itemId);
    if (item.version !== v.expectedVersion) throw conflict();
    if (item.inventoriedAt) invalid("Inventário inicial já registrado.");
    const q = new D(
      toBaseQuantity(
        v.quantity,
        item.unit as "G" | "ML" | "UNIT",
        item.unit as "G" | "ML" | "UNIT",
      ),
    );
    if (v.effectiveDate > todaySaoPaulo(new Date()))
      invalid("Data futura não permitida.");
    if (v.effectiveDate < todaySaoPaulo(new Date()) && !v.reason)
      invalid("Justifique o lançamento retroativo.");
    const value =
      item.method === "MANUAL"
        ? q.times(item.manualUnitCost!.toString()).toFixed()
        : (v.value ?? (q.isZero() ? "0" : null));
    if (value === null) invalid("Informe o valor do estoque inicial.");
    const movement = await tx.stockMovement.create({
      data: {
        itemId: item.id,
        kind: "OPENING",
        quantity: q.toFixed(),
        method: item.method,
        manualUnitCost: item.manualUnitCost,
        confirmedValue: value,
        actorId: actor.id,
        reason: v.reason ?? "",
        effectiveDate: civilDateToDb(v.effectiveDate),
      },
    });
    await tx.stockMovementAllocation.create({
      data: { movementId: movement.id, quantity: q.toFixed() },
    });
    return itemDTO(
      await tx.stockItem.update({
        where: { id: item.id },
        data: { inventoriedAt: new Date(), version: { increment: 1 } },
      }),
    );
  });
}
