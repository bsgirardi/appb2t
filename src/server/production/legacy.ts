import { conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { adoptSchema } from "@/domain/production/validation";
import { todaySaoPaulo, civilDateToDb } from "@/domain/commerce/dates";
import { invalid } from "@/server/stock/movements";
import { runProductionCommand } from "./commands";
import { lockProduction } from "./locks";
import { projectSale } from "./fulfillment";
import { originBalance, restrictedOriginSale } from "./finished-stock";
import { assertFinalDelivery } from "./deliveries";
export async function adoptSaleProduction(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const v = adoptSchema.parse(raw);
  return runProductionCommand(actor, "SALE_ADOPT", v, async (tx) => {
    await lockProduction(tx, { saleIds: [v.saleId] });
    const sale = await tx.sale.findUniqueOrThrow({
      where: { id: v.saleId },
      include: { items: true },
    });
    if (
      sale.version !== v.expectedVersion ||
      sale.fulfillmentMode !== "LEGACY" ||
      ["RASCUNHO", "ENTREGUE", "CANCELADA"].includes(sale.status)
    )
      throw conflict();
    if (
      v.lines.length !== sale.items.length ||
      new Set(v.lines.map((l) => l.saleItemId)).size !== v.lines.length
    )
      invalid("Reconcilie todas as linhas uma única vez.");
    const stocks = await tx.finishedStock.findMany({
      where: {
        productId: {
          in: sale.items.flatMap((l) => (l.productId ? [l.productId] : [])),
        },
      },
    });
    await lockProduction(tx, { finishedIds: stocks.map((s) => s.id) });
    const date = civilDateToDb(todaySaoPaulo(new Date()));
    for (const input of v.lines) {
      const item = sale.items.find((l) => l.id === input.saleItemId);
      if (!item) invalid("Linha de outra venda.");
      if (
        input.recognizedReadyUnits + input.recognizedDeliveredUnits >
        item!.quantity
      )
        invalid("Reconhecimento excede quantidade vendida.");
      const lineKey = item!.lineKey ?? `legacy:${item!.id}`;
      if (input.lineKey && input.lineKey !== lineKey)
        invalid("Identidade da linha incompatível.");
      if (!item!.lineKey)
        await tx.saleItem.update({
          where: { id: item!.id },
          data: { lineKey },
        });
      let stock = item!.productId
        ? stocks.find((s) => s.productId === item!.productId)
        : null;
      if (item!.productId && (!stock?.active || !stock.inventoriedAt))
        invalid("Inventarie o produto antes da adesão.");
      if (!item!.productId)
        stock = await tx.finishedStock.upsert({
          where: { ownerSaleId_lineKey: { ownerSaleId: sale.id, lineKey } },
          create: { ownerSaleId: sale.id, lineKey, inventoriedAt: new Date() },
          update: {},
        });
      if (item!.productId && input.recognizedReadyUnits) {
        let remaining = input.recognizedReadyUnits;
        const origins = await tx.finishedOrigin.findMany({
          where: { stockId: stock!.id },
          orderBy: { sequence: "asc" },
        });
        for (const origin of origins) {
          const restricted = await restrictedOriginSale(tx, origin.id);
          if (restricted && restricted !== sale.id) continue;
          const units = Math.min(
            remaining,
            Number((await originBalance(tx, origin.id)).available),
          );
          if (!units) continue;
          await tx.finishedCommitment.create({
            data: {
              saleId: sale.id,
              lineKey,
              originId: origin.id,
              events: {
                create: {
                  kind: "RESERVE",
                  units,
                  actorId: actor.id,
                  reason: v.reason,
                },
              },
            },
          });
          remaining -= units;
          if (!remaining) break;
        }
        if (remaining)
          invalid(
            "As peças prontas reconhecidas excedem o estoque disponível. Concilie o inventário antes da adesão.",
          );
        await tx.finishedStock.update({
          where: { id: stock!.id },
          data: { version: { increment: 1 } },
        });
      }
      const total =
        (item!.productId ? 0 : input.recognizedReadyUnits) +
        input.recognizedDeliveredUnits;
      if (!total) continue;
      const origin = await tx.finishedOrigin.create({
        data: {
          stockId: stock!.id,
          kind: "LEGACY",
          movements: {
            create: {
              kind: "LEGACY",
              units: total,
              actorId: actor.id,
              reason: v.reason,
              effectiveDate: date,
            },
          },
        },
      });
      const c = await tx.finishedCommitment.create({
        data: {
          saleId: sale.id,
          lineKey,
          originId: origin.id,
          events: {
            create: {
              kind: "RESERVE",
              units: total,
              actorId: actor.id,
              reason: v.reason,
            },
          },
        },
      });
      if (input.recognizedDeliveredUnits) {
        const m = await tx.finishedMovement.create({
          data: {
            originId: origin.id,
            kind: "DELIVERY",
            units: -input.recognizedDeliveredUnits,
            actorId: actor.id,
            effectiveDate: date,
            reason: v.reason,
          },
        });
        await tx.finishedCommitmentEvent.create({
          data: {
            commitmentId: c.id,
            kind: "DELIVER",
            units: -input.recognizedDeliveredUnits,
            actorId: actor.id,
            reason: v.reason,
          },
        });
        await tx.productionDelivery.create({
          data: {
            saleId: sale.id,
            actorId: actor.id,
            effectiveDate: date,
            notes: `Reconhecimento legado: ${v.reason}`,
            lines: {
              create: {
                lineKey,
                commitmentId: c.id,
                units: input.recognizedDeliveredUnits,
                movementId: m.id,
              },
            },
          },
        });
      }
      await tx.finishedStock.update({
        where: { id: stock!.id },
        data: { version: { increment: 1 } },
      });
    }
    await tx.sale.update({
      where: { id: sale.id },
      data: { fulfillmentMode: "U3" },
    });
    await assertFinalDelivery(tx, sale.id);
    await projectSale(tx, sale.id);
    await tx.commerceEvent.create({
      data: {
        saleId: sale.id,
        action: "PRODUCTION_ADOPT",
        actorId: actor.id,
        actorName: actor.name,
        reason: v.reason,
      },
    });
    return { id: sale.id, fulfillmentMode: "U3" };
  });
}
