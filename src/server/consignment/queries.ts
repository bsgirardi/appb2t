import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { civilDateSchema } from "@/domain/commerce/validation";
import { todaySaoPaulo, civilDateToDb } from "@/domain/commerce/dates";
import { StockDecimal as D } from "@/domain/stock/quantities";
import { requireConsignmentActor } from "./authorization";
import { partnerDTO } from "./partners";
import { shipmentDTO, allocationBalance } from "./custody";
import { consignmentSaleDTO } from "./sales";
import { statementDTO } from "./statements";
import {
  originBalance,
  restrictedOriginSale,
} from "@/server/production/finished-stock";
import { isConsignmentProductEligible } from "@/domain/consignment/eligibility";
export const consignmentFilterSchema = z
  .object({
    query: z.string().trim().max(200).default(""),
    partnerId: z.string().max(100).optional(),
    productId: z.string().max(100).optional(),
    from: civilDateSchema.optional(),
    to: civilDateSchema.optional(),
    pending: z.enum(["all", "replenishment", "transit"]).default("all"),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: "Período inválido.",
  });
export async function partnerBalances(
  tx: Prisma.TransactionClient,
  partnerId: string,
) {
  const lines = await tx.consignmentShipmentLine.findMany({
    where: { shipment: { partnerId } },
    include: { product: { select: { name: true } }, allocations: true },
    orderBy: { id: "asc" },
  });
  const conditions = await tx.partnerProductCondition.findMany({
    where: { partnerId },
    include: { product: { select: { name: true } } },
  });
  const grouped = new Map<
    string,
    {
      productId: string;
      name: string;
      outbound: number;
      partner: number;
      inbound: number;
      sold: number;
      lost: number;
      minimum: number | null;
      replenishment: boolean;
    }
  >();
  for (const c of conditions)
    grouped.set(c.productId, {
      productId: c.productId,
      name: c.product.name,
      outbound: 0,
      partner: 0,
      inbound: 0,
      sold: 0,
      lost: 0,
      minimum: c.minimum,
      replenishment: false,
    });
  for (const l of lines) {
    const row = grouped.get(l.productId) ?? {
      productId: l.productId,
      name: l.product.name,
      outbound: 0,
      partner: 0,
      inbound: 0,
      sold: 0,
      lost: 0,
      minimum: null,
      replenishment: false,
    };
    for (const a of l.allocations) {
      const b = await allocationBalance(tx, a.id);
      for (const k of [
        "outbound",
        "partner",
        "inbound",
        "sold",
        "lost",
      ] as const)
        row[k] += b[k];
    }
    grouped.set(l.productId, row);
  }
  return [...grouped.values()].map((r) => ({
    ...r,
    replenishment: r.minimum !== null && r.partner < r.minimum,
  }));
}
export async function listPartners(actor: Actor, raw: unknown) {
  const f = consignmentFilterSchema.parse(raw);
  return db.$transaction(
    async (tx) => {
      await requireConsignmentActor(tx, actor);
      const rows = await tx.partner.findMany({
        where: {
          ...(f.partnerId ? { id: f.partnerId } : {}),
          customer: { name: { contains: f.query, mode: "insensitive" } },
          ...(f.productId
            ? {
                OR: [
                  { conditions: { some: { productId: f.productId } } },
                  {
                    shipments: {
                      some: { lines: { some: { productId: f.productId } } },
                    },
                  },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      const result = [];
      for (const row of rows) {
        const p = await partnerDTO(tx, row.id),
          balances = (await partnerBalances(tx, row.id)).filter(
            (b) => !f.productId || b.productId === f.productId,
          );
        if (
          f.pending === "replenishment" &&
          !balances.some((b) => b.replenishment)
        )
          continue;
        if (
          f.pending === "transit" &&
          !balances.some((b) => b.outbound || b.inbound)
        )
          continue;
        result.push({ ...p, balances });
      }
      return {
        items: result.slice((f.page - 1) * f.pageSize, f.page * f.pageSize),
        total: result.length,
        page: f.page,
        pageSize: f.pageSize,
        totals: {
          partner: result.reduce(
            (n, p) => n + p.balances.reduce((s, b) => s + b.partner, 0),
            0,
          ),
          outbound: result.reduce(
            (n, p) => n + p.balances.reduce((s, b) => s + b.outbound, 0),
            0,
          ),
          inbound: result.reduce(
            (n, p) => n + p.balances.reduce((s, b) => s + b.inbound, 0),
            0,
          ),
        },
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
export async function getPartner(actor: Actor, id: string) {
  return db.$transaction(
    async (tx) => {
      await requireConsignmentActor(tx, actor);
      const partner = await partnerDTO(tx, id);
      const [shipments, sales, statements, events] = await Promise.all([
        tx.consignmentShipment.findMany({
          where: { partnerId: id },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true },
        }),
        tx.consignmentSale.findMany({
          where: { partnerId: id },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true },
        }),
        actor.role === "ADMIN"
          ? tx.consignmentStatement.findMany({
              where: { partnerId: id },
              orderBy: { createdAt: "desc" },
              take: 20,
              select: { id: true },
            })
          : Promise.resolve([]),
        tx.consignmentEvent.findMany({
          where: { partnerId: id },
          orderBy: { sequence: "desc" },
          take: 50,
          select: {
            id: true,
            kind: true,
            actorName: true,
            reason: true,
            receiver: true,
            effectiveDate: true,
          },
        }),
      ]);
      const allocations = await tx.consignmentShipmentAllocation.findMany({
        where: { line: { shipment: { partnerId: id, status: "DISPATCHED" } } },
        include: {
          line: {
            include: {
              product: { select: { name: true } },
              shipment: { select: { sequence: true } },
            },
          },
          origin: { select: { sequence: true } },
        },
        orderBy: { id: "asc" },
      });
      const received = [];
      for (const a of allocations) {
        const balance = await allocationBalance(tx, a.id);
        if (balance.partner)
          received.push({
            id: a.id,
            productId: a.line.productId,
            name: a.line.product.name,
            shipmentNumber: a.line.shipment.sequence,
            originNumber: a.origin.sequence,
            available: balance.partner,
          });
      }
      const pending =
        actor.role === "ADMIN"
          ? await tx.consignmentSale.findMany({
              where: {
                partnerId: id,
                status: "CONFIRMED",
                statementLines: { none: { active: true } },
              },
              select: { effectiveDate: true },
            })
          : [];
      const overdue =
        actor.role === "ADMIN"
          ? await tx.financialEntry.findMany({
              where: {
                canceledAt: null,
                dueDate: { lt: civilDateToDb(todaySaoPaulo(new Date())) },
                consignmentLink: {
                  consignmentSale: { partnerId: id, status: "CONFIRMED" },
                },
              },
              include: {
                settlements: {
                  include: { movement: { include: { reversedBy: true } } },
                },
              },
            })
          : [];
      const overdueTitles = overdue.filter((e) =>
        new D(e.amount.toFixed()).gt(
          e.settlements
            .filter((s) => s.movement && !s.movement.reversedBy)
            .reduce((n, s) => n.plus(s.amount.toFixed()), new D(0)),
        ),
      ).length;
      return {
        partner,
        received,
        pendingCompetences: [
          ...new Set(
            pending.map((s) => s.effectiveDate.toISOString().slice(0, 7)),
          ),
        ].sort(),
        overdueTitles,
        balances: await partnerBalances(tx, id),
        shipments: await Promise.all(
          shipments.map((s) => shipmentDTO(tx, s.id)),
        ),
        sales: await Promise.all(
          sales.map(async (s) => {
            const sale = await consignmentSaleDTO(tx, s.id);
            return actor.role === "ADMIN"
              ? sale
              : { ...sale, finance: null, financialLinks: [] };
          }),
        ),
        statements: await Promise.all(
          statements.map((s) => statementDTO(tx, s.id)),
        ),
        events: events.map((e) => ({
          ...e,
          effectiveDate: e.effectiveDate.toISOString().slice(0, 10),
        })),
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
export type PartnerDetailDTO = Awaited<ReturnType<typeof getPartner>>;
export async function consignmentOptions(actor: Actor) {
  return db.$transaction(
    async (tx) => {
      await requireConsignmentActor(tx, actor);
      const [customers, users, products, origins] = await Promise.all([
        tx.customer.findMany({
          where: { active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        tx.user.findMany({
          where: { active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        tx.product.findMany({
          where: { active: true },
          select: {
            id: true,
            name: true,
            price: true,
            configuration: true,
            colors: true,
            sizes: true,
          },
          orderBy: { name: "asc" },
        }),
        tx.finishedOrigin.findMany({
          where: {
            stock: {
              active: true,
              inventoriedAt: { not: null },
              productId: { not: null },
            },
          },
          include: { stock: { select: { productId: true } } },
          orderBy: { sequence: "asc" },
        }),
      ]);
      const eligible = [];
      const eligibleProducts = products.filter(isConsignmentProductEligible);
      for (const o of origins) {
        const balance = await originBalance(tx, o.id);
        if (
          eligibleProducts.some((p) => p.id === o.stock.productId) &&
          Number(balance.available) > 0 &&
          !(await restrictedOriginSale(tx, o.id))
        )
          eligible.push({
            id: o.id,
            productId: o.stock.productId!,
            available: Number(balance.available),
            sequence: o.sequence,
          });
      }
      return {
        customers,
        users,
        products: eligibleProducts.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price.toFixed(2),
        })),
        origins: eligible,
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
export type ConsignmentOptionsDTO = Awaited<
  ReturnType<typeof consignmentOptions>
>;
export async function listConsignmentDocuments(
  actor: Actor,
  kind: "shipments" | "sales" | "statements",
  raw: unknown,
) {
  const f = consignmentFilterSchema.parse(raw);
  if (kind === "statements") assertAdmin(actor);
  return db.$transaction(
    async (tx) => {
      await requireConsignmentActor(tx, actor, kind === "statements");
      const where = {
        ...(f.partnerId ? { partnerId: f.partnerId } : {}),
        ...(f.productId && kind !== "statements"
          ? { lines: { some: { productId: f.productId } } }
          : {}),
      };
      if (kind === "shipments") {
        const [total, rows] = await Promise.all([
          tx.consignmentShipment.count({ where }),
          tx.consignmentShipment.findMany({
            where,
            skip: (f.page - 1) * f.pageSize,
            take: f.pageSize,
            orderBy: { createdAt: "desc" },
            select: { id: true },
          }),
        ]);
        return {
          items: await Promise.all(rows.map((r) => shipmentDTO(tx, r.id))),
          total,
          page: f.page,
          pageSize: f.pageSize,
        };
      }
      if (kind === "sales") {
        const dated = {
          ...where,
          ...(f.from || f.to
            ? {
                effectiveDate: {
                  ...(f.from ? { gte: new Date(f.from + "T00:00:00Z") } : {}),
                  ...(f.to ? { lte: new Date(f.to + "T00:00:00Z") } : {}),
                },
              }
            : {}),
        };
        const [total, rows] = await Promise.all([
          tx.consignmentSale.count({ where: dated }),
          tx.consignmentSale.findMany({
            where: dated,
            skip: (f.page - 1) * f.pageSize,
            take: f.pageSize,
            orderBy: { createdAt: "desc" },
            select: { id: true },
          }),
        ]);
        return {
          items: await Promise.all(
            rows.map(async (r) => {
              const sale = await consignmentSaleDTO(tx, r.id);
              return actor.role === "ADMIN"
                ? sale
                : { ...sale, finance: null, financialLinks: [] };
            }),
          ),
          total,
          page: f.page,
          pageSize: f.pageSize,
        };
      }
      const statementWhere = {
        ...(f.partnerId ? { partnerId: f.partnerId } : {}),
        ...(f.productId
          ? {
              lines: {
                some: {
                  consignmentSale: {
                    lines: { some: { productId: f.productId } },
                  },
                },
              },
            }
          : {}),
      };
      const [total, rows] = await Promise.all([
        tx.consignmentStatement.count({ where: statementWhere }),
        tx.consignmentStatement.findMany({
          where: statementWhere,
          skip: (f.page - 1) * f.pageSize,
          take: f.pageSize,
          orderBy: { createdAt: "desc" },
          select: { id: true },
        }),
      ]);
      return {
        items: await Promise.all(rows.map((r) => statementDTO(tx, r.id))),
        total,
        page: f.page,
        pageSize: f.pageSize,
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
export async function getConsignmentDocument(
  actor: Actor,
  kind: "shipments" | "sales" | "statements",
  id: string,
) {
  if (kind === "statements") assertAdmin(actor);
  return db.$transaction(
    async (tx) => {
      await requireConsignmentActor(tx, actor, kind === "statements");
      if (kind === "shipments") return shipmentDTO(tx, id);
      if (kind === "statements") return statementDTO(tx, id);
      const sale = await consignmentSaleDTO(tx, id);
      return actor.role === "ADMIN"
        ? sale
        : { ...sale, finance: null, financialLinks: [] };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
