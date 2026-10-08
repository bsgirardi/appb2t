import { z } from "zod";
import { commandMeta, stockQuantity } from "@/domain/stock/validation";
import { id, reason } from "@/domain/production/validation";
import { StockDecimal as D } from "@/domain/stock/quantities";
import { assertAdmin } from "@/server/auth/authorization";
import type { Actor } from "@/server/auth/session";
import { AppError, conflict } from "@/lib/errors";
import { invalid } from "@/server/stock/movements";
import { lineContext, orderDTO } from "./orders";
import { lockProduction } from "./locks";
import { runProductionCommand } from "./commands";
const schema = z
  .object({
    ...commandMeta,
    eventId: id,
    movementId: id,
    quantity: stockQuantity,
    reason,
  })
  .strict();
export async function linkExistingConsumption(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const v = schema.parse(raw);
  return runProductionCommand(
    actor,
    "PRODUCTION_LINK_MATERIAL",
    v,
    async (tx) => {
      const e = await tx.productionEvent.findUnique({
        where: { id: v.eventId },
      });
      if (!e) throw new AppError("NOT_FOUND", "Apontamento não encontrado.");
      const { order: o, line: l } = await lineContext(tx, e.lineId);
      if (o.version !== v.expectedVersion) throw conflict();
      const m = await tx.stockMovement.findUnique({
        where: { id: v.movementId },
      });
      if (!m || m.kind !== "CONSUMPTION") invalid("Origem não é consumo.");
      await lockProduction(tx, { itemIds: [m!.itemId] });
      const source = await tx.stockReservationEvent.findFirst({
        where: { movementId: v.movementId, kind: "CONSUME" },
        include: { reservation: true },
      });
      if (
        !source ||
        !o.saleId ||
        source.reservation.saleId !== o.saleId ||
        source.reservation.lineKey !== l.saleLineKey
      )
        invalid("Consumo sem vínculo demonstrável à linha da venda.");
      const returns = await tx.stockMovement.aggregate({
        where: { sourceId: m!.id, kind: "RETURN_CONSUMPTION" },
        _sum: { quantity: true },
      });
      const allocated = await tx.productionMaterialLink.aggregate({
        where: { movementId: m!.id },
        _sum: { quantity: true },
      });
      const q = new D(v.quantity),
        net = new D(m!.quantity.abs().toString())
          .minus(returns._sum.quantity?.toString() ?? 0)
          .minus(allocated._sum.quantity?.toString() ?? 0);
      if (!q.gt(0) || q.gt(net))
        invalid("Vínculo excede o consumo líquido ainda não atribuído.");
      const update = await tx.productionEvent.create({
        data: {
          lineId: l.id,
          kind: "UPDATE",
          sourceId: e.id,
          actorId: actor.id,
          effectiveDate: e.effectiveDate,
          reason: v.reason,
        },
      });
      await tx.productionMaterialLink.create({
        data: { eventId: update.id, movementId: m!.id, quantity: v.quantity },
      });
      await tx.productionOrder.update({
        where: { id: o.id },
        data: { version: { increment: 1 } },
      });
      return orderDTO(tx, o.id);
    },
  );
}
