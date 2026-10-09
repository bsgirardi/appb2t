import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { Actor } from "@/server/auth/session";
import { civilDateToDb } from "@/domain/commerce/dates";
import { civilDateSchema } from "@/domain/commerce/validation";
import { requireProductionActor } from "./commands";
import { orderDTO } from "./orders";
import { refreshProductionCosts } from "./costs";
import {
  finishedDTO,
  originBalance,
  restrictedOriginSale,
} from "./finished-stock";
import {
  allocationRemaining,
  reservationRemaining,
  allocatedTotal,
} from "./reservations";
import { commitmentRemaining } from "./fulfillment";
export const productionFilterSchema = z
  .object({
    query: z.string().max(160).default(""),
    status: z
      .enum(["RASCUNHO", "LIBERADA", "EM_EXECUCAO", "CONCLUIDA", "CANCELADA"])
      .optional(),
    origin: z.enum(["SALE", "STOCK"]).optional(),
    responsibleId: z.string().optional(),
    saleId: z.string().optional(),
    dueFrom: civilDateSchema.optional(),
    dueTo: civilDateSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export async function listOrders(actor: Actor, raw: unknown = {}) {
  await requireProductionActor(actor);
  const f = productionFilterSchema.parse(raw);
  const where: Prisma.ProductionOrderWhereInput = {
    status: f.status,
    origin: f.origin,
    responsibleId: f.responsibleId,
    saleId: f.saleId,
    ...(f.query
      ? {
          lines: {
            some: { description: { contains: f.query, mode: "insensitive" } },
          },
        }
      : {}),
    ...(f.dueFrom || f.dueTo
      ? {
          dueDate: {
            gte: f.dueFrom ? civilDateToDb(f.dueFrom) : undefined,
            lte: f.dueTo ? civilDateToDb(f.dueTo) : undefined,
          },
        }
      : {}),
  };
  return db.$transaction(async (tx) => {
    const [rows, total] = await Promise.all([
      tx.productionOrder.findMany({
        where,
        orderBy: { sequence: "desc" },
        skip: (f.page - 1) * f.pageSize,
        take: f.pageSize,
      }),
      tx.productionOrder.count({ where }),
    ]);
    return {
      items: await Promise.all(rows.map((o) => orderDTO(tx, o.id))),
      total,
    };
  });
}
export async function getOrder(actor: Actor, id: string) {
  await requireProductionActor(actor);
  const base = await db.$transaction(async (tx) => {
    const dto = await orderDTO(tx, id);
    const events = await tx.productionEvent.findMany({
      where: { line: { orderId: id } },
      orderBy: { sequence: "desc" },
      include: {
        materialLinks: { include: { movement: { select: { itemId: true } } } },
      },
    });
    const allocations = await tx.productionReservationAllocation.findMany({
      where: { line: { orderId: id } },
      include: {
        reservation: {
          include: { item: { select: { name: true, unit: true } } },
        },
      },
    });
    const origins = await tx.finishedOrigin.findMany({
      where: { line: { orderId: id } },
      include: { commitments: true },
    });
    const saleReservations = dto.saleId
      ? await tx.stockReservation.findMany({
          where: { saleId: dto.saleId },
          include: {
            item: { select: { name: true, unit: true } },
            events: { where: { kind: "CONSUME" } },
          },
        })
      : [];
    return {
      ...dto,
      saleReservations: await Promise.all(
        saleReservations.map(async (r) => ({
          id: r.id,
          version: r.version,
          lineKey: r.lineKey,
          itemId: r.itemId,
          name: r.item.name,
          unit: r.item.unit,
          available: (await reservationRemaining(tx, r.id))
            .minus(await allocatedTotal(tx, r.id))
            .toFixed(),
        })),
      ),
      previousConsumptions: saleReservations.flatMap((r) =>
        r.events.flatMap((e) =>
          e.movementId
            ? [
                {
                  id: e.movementId,
                  lineKey: r.lineKey,
                  name: r.item.name,
                  quantity: e.quantity.toFixed(),
                },
              ]
            : [],
        ),
      ),
      events: events.map((e) => ({
        id: e.id,
        lineId: e.lineId,
        kind: e.kind,
        goodUnits: e.goodUnits,
        failedUnits: e.failedUnits,
        canceledUnits: e.canceledUnits,
        machineMinutes: e.machineMinutes?.toFixed() ?? null,
        setupMinutes: e.setupMinutes?.toFixed() ?? null,
        finishingMinutes: e.finishingMinutes?.toFixed() ?? null,
        executorId: e.executorId,
        printerId: e.printerId,
        actorId: e.actorId,
        reason: e.reason,
        effectiveDate: e.effectiveDate.toISOString().slice(0, 10),
        sourceId: e.sourceId,
        materialLinks: e.materialLinks.map((m) => ({
          id: m.id,
          movementId: m.movementId,
          itemId: m.movement.itemId,
          quantity: m.quantity.toFixed(),
        })),
      })),
      allocations: await Promise.all(
        allocations.map(async (a) => ({
          id: a.id,
          lineId: a.lineId,
          itemId: a.reservation.itemId,
          name: a.reservation.item.name,
          unit: a.reservation.item.unit,
          remaining: (await allocationRemaining(tx, a.id)).toFixed(),
        })),
      ),
      origins: await Promise.all(
        origins.map(async (o) => ({
          id: o.id,
          lineId: o.lineId,
          stockId: o.stockId,
          ...(await originBalance(tx, o.id)),
          commitments: await Promise.all(
            o.commitments.map(async (c) => ({
              id: c.id,
              saleId: c.saleId,
              lineKey: c.lineKey,
              remaining: await commitmentRemaining(tx, c.id),
            })),
          ),
        })),
      ),
    };
  });
  return {
    ...base,
    ...(actor.role === "ADMIN"
      ? { cost: await refreshProductionCosts(actor, id) }
      : {}),
  };
}
export async function listFinished(actor: Actor, raw: unknown = {}) {
  await requireProductionActor(actor);
  const f = productionFilterSchema.parse(raw);
  const where: Prisma.FinishedStockWhereInput = f.query
    ? { product: { name: { contains: f.query, mode: "insensitive" } } }
    : {};
  if (f.saleId) {
    const items = await db.saleItem.findMany({
      where: { saleId: f.saleId },
      select: { productId: true },
    });
    where.OR = [
      {
        productId: {
          in: items.flatMap((i) => (i.productId ? [i.productId] : [])),
        },
      },
      { ownerSaleId: f.saleId },
    ];
  }
  return db.$transaction(async (tx) => {
    const rows = await tx.finishedStock.findMany({
      where,
      include: {
        product: { select: { name: true } },
        origins: { orderBy: { sequence: "asc" } },
      },
      orderBy: { id: "asc" },
      skip: f.saleId ? undefined : (f.page - 1) * f.pageSize,
      take: f.saleId ? undefined : f.pageSize,
    });
    return {
      items: await Promise.all(
        rows.map(async (s) => ({
          ...(await finishedDTO(tx, s.id)),
          name: s.product?.name ?? "Peça exclusiva da venda",
          ownerSaleId: s.ownerSaleId,
          lineKey: s.lineKey,
          origins: await Promise.all(
            s.origins.map(async (o) => ({
              id: o.id,
              kind: o.kind,
              restrictedSaleId: await restrictedOriginSale(tx, o.id),
              lineId: o.lineId,
              ...(await originBalance(tx, o.id)),
            })),
          ),
        })),
      ),
      total: await tx.finishedStock.count({ where }),
    };
  });
}
export async function listDeliveries(actor: Actor, raw: unknown = {}) {
  await requireProductionActor(actor);
  const f = productionFilterSchema.parse(raw);
  const where = { saleId: f.saleId };
  const [rows, total] = await Promise.all([
    db.productionDelivery.findMany({
      where,
      include: { lines: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
    }),
    db.productionDelivery.count({ where }),
  ]);
  return {
    items: rows.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      effectiveDate: d.effectiveDate.toISOString().slice(0, 10),
    })),
    total,
  };
}
export async function productionOptions(actor: Actor) {
  await requireProductionActor(actor);
  const [products, users, printers, materials, sales] = await Promise.all([
    db.product.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.printer.findMany({
      where: { active: true },
      select: { id: true, name: true, technology: true },
      orderBy: { name: "asc" },
    }),
    db.stockItem.findMany({
      where: { active: true, inventoriedAt: { not: null } },
      select: {
        id: true,
        name: true,
        unit: true,
        identities: { select: { id: true, label: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.sale.findMany({
      where: { status: { notIn: ["RASCUNHO", "CANCELADA", "ENTREGUE"] } },
      select: {
        id: true,
        sequence: true,
        version: true,
        fulfillmentMode: true,
        items: {
          select: {
            id: true,
            lineKey: true,
            productId: true,
            description: true,
            quantity: true,
          },
        },
      },
      orderBy: { sequence: "desc" },
    }),
  ]);
  return { products, users, printers, materials, sales };
}
export async function saleProduction(actor: Actor, saleId: string) {
  await requireProductionActor(actor);
  return db.$transaction(async (tx) => {
    const sale = await tx.sale.findUniqueOrThrow({
      where: { id: saleId },
      include: { items: true },
    });
    const commitments = await tx.finishedCommitment.findMany({
      where: { saleId },
      include: { origin: { include: { stock: true } } },
    });
    const deliveries = await tx.productionDelivery.findMany({
      where: { saleId },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      id: sale.id,
      deliveries: deliveries.map((d) => ({
        id: d.id,
        version: d.version,
        sourceId: d.sourceId,
        effectiveDate: d.effectiveDate.toISOString().slice(0, 10),
        notes: d.notes,
        lines: d.lines.map((l) => ({
          id: l.id,
          lineKey: l.lineKey,
          units: l.units,
          remaining:
            l.units +
            deliveries
              .flatMap((x) => x.lines)
              .filter((x) => x.sourceLineId === l.id)
              .reduce((n, x) => n + x.units, 0),
        })),
      })),
      version: sale.version,
      fulfillmentMode: sale.fulfillmentMode,
      lines: await Promise.all(
        sale.items.map(async (l) => ({
          id: l.id,
          lineKey: l.lineKey ?? `legacy:${l.id}`,
          productId: l.productId,
          description: l.description,
          sold: l.quantity,
          delivered:
            (
              await tx.productionDeliveryLine.aggregate({
                where: { delivery: { saleId }, lineKey: l.lineKey ?? "" },
                _sum: { units: true },
              })
            )._sum.units ?? 0,
          commitments: await Promise.all(
            commitments
              .filter((c) => c.lineKey === l.lineKey)
              .map(async (c) => ({
                id: c.id,
                originId: c.originId,
                stockId: c.origin.stockId,
                stockVersion: c.origin.stock.version,
                remaining: await commitmentRemaining(tx, c.id),
              })),
          ),
        })),
      ),
    };
  });
}
export type ProductionOptions = Awaited<ReturnType<typeof productionOptions>>;
export type OrderDetail = Awaited<ReturnType<typeof getOrder>>;
export type FinishedDetail = Awaited<
  ReturnType<typeof listFinished>
>["items"][number];
export type SaleProduction = Awaited<ReturnType<typeof saleProduction>>;
