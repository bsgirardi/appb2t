import { z } from "zod";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { commandMeta } from "@/domain/stock/validation";
import { StockDecimal as D } from "@/domain/stock/quantities";
import { conflict } from "@/lib/errors";
import { lockOperation } from "../commerce/locks";
import { runStockCommand, lockStockItems } from "./commands";
import { requireStockItem } from "./catalog";
import { readValuation } from "./valuation";
import { invalid } from "./movements";
const schema = z
  .object({
    ...commandMeta,
    itemId: z.string(),
    catalogVersion: z.number().int().positive(),
    reason: z.string().trim().min(3).max(2000),
  })
  .strict();
export async function applyStockReference(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const v = schema.parse(raw);
  return runStockCommand(actor, "APPLY_REFERENCE", v, async (tx) => {
    await lockOperation(tx, "stock:catalog");
    await lockStockItems(tx, [v.itemId]);
    const item = await requireStockItem(tx, v.itemId);
    if (item.version !== v.expectedVersion) throw conflict();
    const value = await readValuation(tx, item.id);
    if (
      !item.active ||
      !item.inventoriedAt ||
      value.provisional ||
      value.unitCost === null ||
      new D(value.physical).lt(0)
    )
      invalid("Regularize estoque e custos antes de aplicar a referência.");
    if (item.materialId) {
      const material = await tx.material.findUniqueOrThrow({
        where: { id: item.materialId },
      });
      if (material.version !== v.catalogVersion) throw conflict();
      const current = new D(value.unitCost!).times(1000);
      if (current.gte("1000000000000"))
        invalid("Referência excede o limite do cadastro.");
      await tx.material.update({
        where: { id: material.id, version: v.catalogVersion },
        data: { price: current.toFixed(6), version: { increment: 1 } },
      });
      return {
        id: material.id,
        previous: material.price.toFixed(),
        current: current.toFixed(),
      };
    }
    if (item.extraId) {
      const extra = await tx.pricingExtra.findUniqueOrThrow({
        where: { id: item.extraId },
      });
      if (extra.version !== v.catalogVersion) throw conflict();
      if (new D(value.unitCost!).gte("1000000000000"))
        invalid("Referência excede o limite do cadastro.");
      await tx.pricingExtra.update({
        where: { id: extra.id, version: v.catalogVersion },
        data: { unitCost: value.unitCost!, version: { increment: 1 } },
      });
      return {
        id: extra.id,
        previous: extra.unitCost.toFixed(),
        current: value.unitCost!,
      };
    }
    return invalid("Vincule um material ou complemento à calculadora.");
  });
}
