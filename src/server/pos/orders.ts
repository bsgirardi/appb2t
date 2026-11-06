import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { lockOperation } from "@/server/commerce/locks";
import { lockPlanning } from "@/server/planning/coordination";
import { reconcilePlanningTx } from "@/server/planning/invariants";
import { lockKitCatalog } from "@/server/kits/locks";
import { lockProduction } from "@/server/production/locks";
import { requireProductionActor } from "@/server/production/commands";
import { reserveFinishedWithClient } from "@/server/production/fulfillment";
import { recordDeliveryWithClient } from "@/server/production/deliveries";
import { availablePosOrigins, posProductReason } from "./catalog";
import { confirmSaleWithClient } from "@/server/sales";
import { itemColumns } from "@/server/pricing/document-costs";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { calculateDocumentTotals } from "@/domain/commerce/totals";
import {
  quantityBasePrice,
  quantityTiersSchema,
} from "@/domain/products/quantity-pricing";
import { customerSchema } from "@/domain/customers/validation";
import {
  posDraftSchema,
  posDocumentSchema,
  calculatePosPayment,
} from "@/domain/pos/validation";
import { emptyPosDraft, type PosOrderDTO } from "@/domain/pos/types";
import { getSaleReceiptSummary } from "@/server/finance/entries";
const json = (v: unknown) => v as Prisma.InputJsonValue;
async function orderDTO(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<PosOrderDTO> {
  const o = await tx.posOrder.findUniqueOrThrow({
    where: { id },
    include: { sale: true },
  });
  const input = posDraftSchema.parse(o.input);
  const sale = o.sale;
  const summary = sale ? await getSaleReceiptSummary(tx, sale.id) : null;
  const total = sale ? (sale.totals as { total: string }).total : "0.00";
  return {
    id: o.id,
    version: o.version,
    input,
    updatedAt: o.updatedAt.toISOString(),
    receipt: sale
      ? {
          saleId: sale.id,
          number: `VEN-${String(sale.sequence).padStart(6, "0")}`,
          status: sale.status,
          total,
          customerName: (sale.snapshot as { customer: { name: string } })
            .customer.name,
          payment: calculatePosPayment(total, input.method, input.tendered),
          received: summary!.received,
          pending: summary!.pending,
        }
      : null,
  };
}
async function owned(tx: Prisma.TransactionClient, actor: Actor, id: string) {
  await lockOperation(tx, `pos:order:${id}`);
  const order = await tx.posOrder.findFirst({
    where: { id, actorId: actor.id },
  });
  if (!order)
    throw new AppError("NOT_FOUND", "Compra presencial não encontrada.");
  return order;
}
export async function getPosOrder(actor: Actor): Promise<PosOrderDTO | null> {
  await requireProductionActor(actor);
  return db.$transaction(
    async (tx) => {
      const o = await tx.posOrder.findFirst({
        where: { actorId: actor.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      return o ? orderDTO(tx, o.id) : null;
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function startPosOrder(actor: Actor): Promise<PosOrderDTO> {
  await requireProductionActor(actor);
  return db.$transaction(async (tx) => {
    await lockOperation(tx, `pos:actor:${actor.id}`);
    const old = await tx.posOrder.findFirst({
      where: { actorId: actor.id, saleId: null },
    });
    const o =
      old ??
      (await tx.posOrder.create({
        data: { actorId: actor.id, input: json(emptyPosDraft) },
      }));
    return orderDTO(tx, o.id);
  });
}
export async function savePosOrder(
  actor: Actor,
  id: string,
  raw: unknown,
): Promise<PosOrderDTO> {
  await requireProductionActor(actor);
  const input = z
    .object({
      expectedVersion: z.number().int().positive(),
      input: posDraftSchema,
    })
    .strict()
    .parse(raw);
  return db.$transaction(async (tx) => {
    const o = await owned(tx, actor, id);
    if (o.saleId || o.version !== input.expectedVersion) throw conflict();
    await tx.posOrder.update({
      where: { id },
      data: { input: json(input.input), version: { increment: 1 } },
    });
    return orderDTO(tx, id);
  });
}
export async function completePosOrder(
  actor: Actor,
  id: string,
  expectedVersion: number,
): Promise<PosOrderDTO> {
  z.number().int().positive().parse(expectedVersion);
  await requireProductionActor(actor);
  return db.$transaction(
    async (tx) => {
      const o = await owned(tx, actor, id);
      if (o.saleId) return orderDTO(tx, id);
      if (o.version !== expectedVersion) throw conflict();
      const input = posDraftSchema.parse(o.input);
      if (!input.items.length)
        throw new AppError("VALIDATION", "Adicione pelo menos um produto.");
      await lockPlanning(tx);
      await lockKitCatalog(
        tx,
        input.items.map((i) => i.productId),
        [],
      );
      const products = await tx.product.findMany({
        where: { id: { in: input.items.map((i) => i.productId) } },
      });
      const items = input.items.map((i) => {
        const p = products.find((p) => p.id === i.productId);
        if (!p || posProductReason(p))
          throw new AppError(
            "CONFLICT",
            "Um produto exige atendimento pelo fluxo comercial.",
          );
        const price = quantityBasePrice(
          p.price.toFixed(2),
          i.quantity,
          quantityTiersSchema.parse(p.quantityTiers),
        );
        if (
          p.commercialRevision !== i.commercialRevision ||
          price !== i.unitPrice ||
          i.quantity < p.minimumQuantity
        )
          throw new AppError(
            "CONFLICT",
            "Preço, quantidade mínima ou referência mudou. Atualize os produtos e confira a compra.",
          );
        return {
          lineId: p.id,
          productId: p.id,
          description: p.name,
          quantity: i.quantity,
          unitPrice: price,
        };
      });
      const totals = calculateDocumentTotals(items, input.discount, "0.00");
      calculatePosPayment(totals.total, input.method, input.tendered);
      let customerId = input.customerId;
      if (customerId) {
        await tx.$queryRaw`SELECT id FROM "Customer" WHERE id=${customerId} FOR SHARE`;
        const customer = await tx.customer.findFirst({
          where: { id: customerId, active: true },
        });
        if (!customer)
          throw new AppError("VALIDATION", "Selecione um cliente ativo.");
        if (customer.version !== input.customerVersion)
          throw new AppError(
            "CONFLICT",
            "O cadastro do cliente mudou. Consulte e selecione novamente para conferir.",
          );
      } else if (input.newCustomer) {
        customerId = (
          await tx.customer.create({
            data: customerSchema.parse({
              ...input.newCustomer,
              type: "PERSON",
              active: true,
            }),
          })
        ).id;
      }
      const doc = posDocumentSchema.parse({
        customerId,
        ...(!customerId ? { customerIdentification: "UNIDENTIFIED" } : {}),
        items,
        discount: input.discount,
        shipping: "0.00",
        paymentTerms: `PDV · ${input.method === "CASH" ? "Dinheiro" : input.method === "PIX" ? "Pix" : "Cartão"} informado pelo operador. Recebimento a conferir no financeiro.`,
        internalNotes: "Venda presencial com entrega imediata.",
      });
      const sale = await tx.sale.create({
        data: {
          customerId,
          document: json(doc),
          totals: json(totals),
          items: { create: items.map(itemColumns) },
          events: {
            create: {
              action: "POS_CREATE",
              actorId: actor.id,
              actorName: actor.name,
            },
          },
        },
      });
      await tx.posOrder.update({ where: { id }, data: { saleId: sale.id } });
      await confirmSaleWithClient(
        tx,
        { kind: "ADMIN", actor },
        {
          id: sale.id,
          expectedVersion: sale.version,
          rows: [
            {
              number: 1,
              amount: totals.total,
              dueDate: todaySaoPaulo(new Date()),
            },
          ],
        },
      );
      const stocks = await tx.finishedStock.findMany({
        where: { productId: { in: items.map((i) => i.productId) } },
      });
      await lockProduction(tx, {
        saleIds: [sale.id],
        finishedIds: stocks.map((s) => s.id),
      });
      const deliveryLines = [];
      for (const item of items) {
        const origins = await availablePosOrigins(tx, item.productId);
        const stock = stocks.find((s) => s.productId === item.productId);
        if (!stock)
          throw new AppError(
            "CONFLICT",
            "Produto sem estoque pronto inventariado.",
          );
        let left = item.quantity;
        const allocations: { originId: string; units: number }[] = [];
        for (const origin of origins) {
          const units = Math.min(left, origin.available);
          if (units > 0) allocations.push({ originId: origin.id, units });
          left -= units;
          if (!left) break;
        }
        if (left)
          throw new AppError(
            "CONFLICT",
            "Peças disponíveis insuficientes. Confira o estoque antes de concluir.",
          );
        const current = await tx.sale.findUniqueOrThrow({
          where: { id: sale.id },
        });
        await reserveFinishedWithClient(tx, actor, {
          operationKey: id,
          expectedVersion: stock.version,
          saleVersion: current.version,
          saleId: sale.id,
          lineKey: item.lineId,
          stockId: stock.id,
          units: item.quantity,
          originAllocations: allocations,
        });
        const commitments = await tx.finishedCommitment.findMany({
          where: { saleId: sale.id, lineKey: item.lineId },
        });
        deliveryLines.push({
          lineKey: item.lineId,
          allocations: commitments.map((c) => ({
            commitmentId: c.id,
            units: allocations.find((a) => a.originId === c.originId)!.units,
          })),
        });
      }
      const current = await tx.sale.findUniqueOrThrow({
        where: { id: sale.id },
      });
      await recordDeliveryWithClient(tx, actor, {
        operationKey: id,
        expectedVersion: current.version,
        saleId: sale.id,
        effectiveDate: todaySaoPaulo(new Date()),
        notes: "Entrega presencial registrada no PDV.",
        lines: deliveryLines,
      });
      await reconcilePlanningTx(tx);
      await tx.planningState.update({
        where: { id: 1 },
        data: { revision: { increment: 1 } },
      });
      await tx.posOrder.update({
        where: { id },
        data: { version: { increment: 1 } },
      });
      return orderDTO(tx, id);
    },
    { timeout: 20000, maxWait: 10000 },
  );
}

export async function readPosOrder(
  actor: Actor,
  id: string,
): Promise<PosOrderDTO> {
  await requireProductionActor(actor);
  return db.$transaction(async (tx) => {
    await owned(tx, actor, id);
    return orderDTO(tx, id);
  });
}
