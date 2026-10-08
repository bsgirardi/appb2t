import { readValuation } from "./valuation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { stockFilterSchema, type StockFilter } from "@/domain/stock/validation";
import { balance } from "./movements";
async function itemView(
  tx: Prisma.TransactionClient,
  actor: Actor,
  id: string,
) {
  const item = await tx.stockItem.findUnique({
    where: { id },
    include: { identities: { orderBy: { label: "asc" } } },
  });
  if (!item) throw new AppError("NOT_FOUND", "Item não encontrado.");
  const state = await balance(tx, id);
  const movements = await tx.stockMovement.findMany({
    where: { itemId: id },
    orderBy: { sequence: "desc" },
    take: 20,
  });
  const groups = await tx.stockMovementAllocation.groupBy({
    by: ["identityId"],
    where: { movement: { itemId: id } },
    _sum: { quantity: true },
  });
  const base = {
    id: item.id,
    name: item.name,
    unit: item.unit,
    materialId: item.materialId,
    extraId: item.extraId,
    active: item.active,
    version: item.version,
    inventoriedAt: item.inventoriedAt?.toISOString() ?? null,
    ...state,
    identities: [
      {
        id: null as string | null,
        label: "Sem identificação",
        quantity:
          groups.find((g) => g.identityId === null)?._sum.quantity?.toFixed() ??
          "0",
      },
      ...item.identities.map((i) => ({
        id: i.id as string | null,
        label: i.label,
        quantity:
          groups.find((g) => g.identityId === i.id)?._sum.quantity?.toFixed() ??
          "0",
      })),
    ],
    movements: movements.map((m) => ({
      id: m.id,
      kind: m.kind,
      quantity: m.quantity.toFixed(),
      reason: m.reason,
      effectiveDate: m.effectiveDate.toISOString().slice(0, 10),
      createdAt: m.createdAt.toISOString(),
      sourceId: m.sourceId,
      actorId: m.actorId,
    })),
  };
  if (actor.role !== "ADMIN")
    return {
      ...base,
      method: undefined,
      manualUnitCost: undefined,
      valuation: undefined,
    };

  return {
    ...base,
    method: item.method,
    manualUnitCost: item.manualUnitCost?.toFixed() ?? null,
    valuation: await readValuation(tx, id),
  };
}
export async function getStock(actor: Actor, id: string) {
  return db.$transaction((tx) => itemView(tx, actor, id), {
    isolationLevel: "RepeatableRead",
  });
}
export async function listStock(actor: Actor, raw: StockFilter) {
  const v = stockFilterSchema.parse(raw);
  return db.$transaction(
    async (tx) => {
      const where = Prisma.sql`WHERE LOWER(s.name) LIKE ${"%" + v.query.toLowerCase() + "%"} ${v.negative ? Prisma.sql`AND (COALESCE((SELECT SUM(quantity) FROM "StockMovement" m WHERE m."itemId"=s.id),0)-COALESCE((SELECT SUM(CASE WHEN e.kind='RESERVE' THEN e.quantity ELSE -e.quantity END) FROM "StockReservationEvent" e JOIN "StockReservation" r ON r.id=e."reservationId" WHERE r."itemId"=s.id),0))<0` : Prisma.empty}`;
      const ids = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT s.id FROM "StockItem" s ${where} ORDER BY s.name,s.id LIMIT ${v.pageSize} OFFSET ${(v.page - 1) * v.pageSize}`,
      );
      const counts = await tx.$queryRaw<{ n: bigint }[]>(
        Prisma.sql`SELECT count(*) AS n FROM "StockItem" s ${where}`,
      );
      const items = [];
      for (const r of ids) items.push(await itemView(tx, actor, r.id));
      return {
        items,
        total: Number(counts[0].n),
        page: v.page,
        pageSize: v.pageSize,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function listReceipts(actor: Actor, raw: unknown) {
  const v = stockFilterSchema
    .extend({ receiptId: z.string().optional() })
    .parse(raw);
  return db.$transaction(
    async (tx) => {
      const where = {
        ...(v.receiptId ? { id: v.receiptId } : {}),
        supplier: { contains: v.query, mode: "insensitive" as const },
      };
      const rows = await tx.purchaseReceipt.findMany({
        where,
        include: {
          lines: { include: { item: { select: { name: true, unit: true } } } },
          entries: { select: { entryId: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (v.page - 1) * v.pageSize,
        take: v.pageSize,
      });
      const returns =
        actor.role === "ADMIN"
          ? await tx.stockMovement.findMany({
              where: {
                kind: "RETURN_SUPPLIER",
                source: {
                  receiptLine: { receiptId: { in: rows.map((r) => r.id) } },
                },
              },
              include: {
                source: {
                  select: { receiptLine: { select: { receiptId: true } } },
                },
              },
            })
          : [];
      const resolved =
        actor.role === "ADMIN"
          ? await tx.stockCommand.findMany({
              where: { type: "RETURN_FINANCE" },
              select: { result: true },
            })
          : [];
      const resolvedIds = new Set(
        resolved.map((c) => (c.result as { movementId: string }).movementId),
      );
      return {
        total: await tx.purchaseReceipt.count({ where }),
        page: v.page,
        pageSize: v.pageSize,
        items: rows.map((r) => ({
          id: r.id,
          supplier: r.supplier,
          document: r.document,
          status: r.status,
          version: r.version,
          pendingReturns:
            actor.role === "ADMIN"
              ? returns
                  .filter(
                    (m) =>
                      m.source?.receiptLine?.receiptId === r.id &&
                      !resolvedIds.has(m.id),
                  )
                  .map((m) => ({
                    id: m.id,
                    itemId: m.itemId,
                    quantity: m.quantity.abs().toFixed(),
                    reason: m.reason,
                  }))
              : undefined,
          effectiveDate: r.effectiveDate.toISOString().slice(0, 10),
          total:
            actor.role === "ADMIN" ? (r.total?.toFixed(2) ?? null) : undefined,
          entryIds:
            actor.role === "ADMIN"
              ? r.entries.map((e) => e.entryId)
              : undefined,
          lines: r.lines.map((l) => ({
            id: l.id,
            itemId: l.itemId,
            name: l.item.name,
            unit: l.item.unit,
            quantity: l.quantity.toFixed(),
            confirmedValue:
              actor.role === "ADMIN"
                ? (l.confirmedValue?.toFixed(2) ?? null)
                : undefined,
          })),
        })),
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}

import { z } from "zod";
import { StockDecimal as D } from "@/domain/stock/quantities";
const historyFilter = stockFilterSchema.extend({
  reservationId: z.string().optional(),
  itemId: z.string().optional(),
  saleId: z.string().optional(),
});
export async function listReservations(_actor: Actor, raw: unknown = {}) {
  const v = historyFilter.parse(raw),
    where = {
      ...(v.reservationId ? { id: v.reservationId } : {}),
      ...(v.itemId ? { itemId: v.itemId } : {}),
      ...(v.saleId ? { saleId: v.saleId } : {}),
    };
  return db.$transaction(
    async (tx) => {
      const rows = await tx.stockReservation.findMany({
        where,
        include: {
          events: true,
          item: { select: { name: true, unit: true } },
          sale: { select: { sequence: true, status: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (v.page - 1) * v.pageSize,
        take: v.pageSize,
      });
      return {
        total: await tx.stockReservation.count({ where }),
        page: v.page,
        pageSize: v.pageSize,
        items: rows.map((r) => {
          const sum = (kind: string) =>
            r.events
              .filter((e) => e.kind === kind)
              .reduce((s, e) => s.plus(e.quantity.toString()), new D(0));
          return {
            id: r.id,
            itemId: r.itemId,
            name: r.item.name,
            unit: r.item.unit,
            saleId: r.saleId,
            saleNumber: r.sale
              ? `VEN-${String(r.sale.sequence).padStart(6, "0")}`
              : "Produção para estoque",
            saleStatus: r.sale?.status ?? null,
            lineKey: r.lineKey,
            version: r.version,
            reserved: sum("RESERVE").toFixed(),
            consumed: sum("CONSUME").toFixed(),
            released: sum("RELEASE").toFixed(),
            remaining: sum("RESERVE")
              .minus(sum("CONSUME"))
              .minus(sum("RELEASE"))
              .toFixed(),
          };
        }),
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function listMovements(actor: Actor, raw: unknown = {}) {
  const v = historyFilter.parse(raw),
    where = {
      ...(v.itemId ? { itemId: v.itemId } : {}),
      item: { name: { contains: v.query, mode: "insensitive" as const } },
    };
  return db.$transaction(
    async (tx) => {
      const rows = await tx.stockMovement.findMany({
        where,
        include: {
          item: { select: { name: true, unit: true } },
          allocations: { include: { identity: { select: { label: true } } } },
        },
        orderBy: { sequence: "desc" },
        skip: (v.page - 1) * v.pageSize,
        take: v.pageSize,
      });
      return {
        total: await tx.stockMovement.count({ where }),
        page: v.page,
        pageSize: v.pageSize,
        items: rows.map((m) => ({
          id: m.id,
          itemId: m.itemId,
          name: m.item.name,
          unit: m.item.unit,
          kind: m.kind,
          quantity: m.quantity.toFixed(),
          reason: m.reason,
          actorId: m.actorId,
          effectiveDate: m.effectiveDate.toISOString().slice(0, 10),
          createdAt: m.createdAt.toISOString(),
          sourceId: m.sourceId,
          confirmedValue:
            actor.role === "ADMIN"
              ? (m.confirmedValue?.toFixed() ?? null)
              : undefined,
          allocations: m.allocations.map((a) => ({
            identityId: a.identityId,
            label: a.identity?.label ?? "Sem identificação",
            quantity: a.quantity.toFixed(),
          })),
        })),
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function stockOptions(actor: Actor) {
  const materials = await db.material.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      technology: true,
      version: true,
      price: true,
    },
  });
  const extras = await db.pricingExtra.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, version: true, unitCost: true },
  });
  return {
    materials: materials.map((m) => ({
      id: m.id,
      name: m.name,
      technology: m.technology,
      version: m.version,
      price: actor.role === "ADMIN" ? m.price.toFixed() : undefined,
    })),
    extras: extras.map((e) => ({
      id: e.id,
      name: e.name,
      version: e.version,
      unitCost: actor.role === "ADMIN" ? e.unitCost.toFixed() : undefined,
    })),
  };
}
export type StockItemDTO = Awaited<ReturnType<typeof getStock>>;
export type StockReceiptDTO = Awaited<
  ReturnType<typeof listReceipts>
>["items"][number];
export type StockReservationDTO = Awaited<
  ReturnType<typeof listReservations>
>["items"][number];
export type StockOptions = Awaited<ReturnType<typeof stockOptions>>;
