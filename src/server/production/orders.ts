import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import type { OrderDTO } from "@/domain/production/types";
import {
  orderSaveSchema,
  orderActionSchema,
  orderPlanningSchema,
} from "@/domain/production/validation";
import { demandRemaining } from "@/domain/production/quantities";
import { civilDateToDb } from "@/domain/commerce/dates";
import { invalid } from "@/server/stock/movements";
import { lockProduction } from "./locks";
import { runProductionCommand } from "./commands";
import { projectSale } from "./fulfillment";
export async function orderRow(tx: Prisma.TransactionClient, id: string) {
  const o = await tx.productionOrder.findUnique({
    where: { id },
    include: { lines: { include: { events: true } } },
  });
  if (!o) throw new AppError("NOT_FOUND", "Ordem não encontrada.");
  return o;
}
export async function orderDTO(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<OrderDTO> {
  const o = await orderRow(tx, id);
  return {
    id: o.id,
    sequence: o.sequence,
    version: o.version,
    origin: o.origin,
    saleId: o.saleId,
    status: o.status,
    responsibleId: o.responsibleId,
    dueDate: o.dueDate?.toISOString().slice(0, 10) ?? null,
    notes: o.notes,
    lines: o.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      saleLineKey: l.saleLineKey,
      description: l.description,
      technology: l.technology,
      targetUnits: l.targetUnits,
      plannedPrinterId: l.plannedPrinterId,
      goodUnits: l.events.reduce((s, e) => s + e.goodUnits, 0),
      failedUnits: l.events.reduce((s, e) => s + e.failedUnits, 0),
      canceledUnits: l.events.reduce((s, e) => s + e.canceledUnits, 0),
    })),
  };
}
export async function demand(
  tx: Prisma.TransactionClient,
  saleId: string,
  lineKey: string,
) {
  const item = await tx.saleItem.findFirst({ where: { saleId, lineKey } });
  if (!item) invalid("Item da venda não encontrado.");
  const deliveries = await tx.productionDeliveryLine.aggregate({
    where: { delivery: { saleId }, lineKey },
    _sum: { units: true },
  });
  const events = await tx.finishedCommitmentEvent.aggregate({
    where: { commitment: { saleId, lineKey } },
    _sum: { units: true },
  });
  const lines = await tx.productionLine.findMany({
    where: {
      saleLineKey: lineKey,
      order: { saleId, status: { notIn: ["RASCUNHO", "CANCELADA"] } },
    },
    include: { events: true },
  });
  const pending = lines.reduce(
    (s, l) =>
      s +
      Math.max(
        0,
        l.targetUnits -
          l.events.reduce((n, e) => n + e.goodUnits + e.canceledUnits, 0),
      ),
    0,
  );
  return {
    item: item!,
    remaining: demandRemaining(
      item!.quantity,
      deliveries._sum.units ?? 0,
      events._sum.units ?? 0,
      pending,
    ),
  };
}
export async function activeSale(tx: Prisma.TransactionClient, id: string) {
  const s = await tx.sale.findUnique({ where: { id } });
  if (
    !s ||
    s.fulfillmentMode !== "U3" ||
    ["RASCUNHO", "ENTREGUE", "CANCELADA"].includes(s.status)
  )
    invalid("Venda não disponível para produção. Confira o modo e o estado.");
  return s!;
}
async function validatePeople(
  tx: Prisma.TransactionClient,
  responsibleId: string | null | undefined,
  lines: { plannedPrinterId?: string | null; technology: string }[],
) {
  if (
    responsibleId &&
    !(await tx.user.findFirst({ where: { id: responsibleId, active: true } }))
  )
    invalid("Responsável inativo ou inexistente.");
  for (const l of lines)
    if (l.plannedPrinterId) {
      const p = await tx.printer.findUnique({
        where: { id: l.plannedPrinterId },
      });
      if (!p?.active || p.technology !== l.technology)
        invalid("Máquina indisponível ou incompatível.");
    }
}
export async function lockOrder(tx: Prisma.TransactionClient, id: string) {
  const pre = await orderRow(tx, id);
  await lockProduction(tx, {
    saleIds: pre.saleId ? [pre.saleId] : [],
    orderIds: [id],
  });
  return orderRow(tx, id);
}
export async function lineContext(
  tx: Prisma.TransactionClient,
  lineId: string,
) {
  const l = await tx.productionLine.findUnique({ where: { id: lineId } });
  if (!l) throw new AppError("NOT_FOUND", "Linha da ordem não encontrada.");
  const o = await lockOrder(tx, l.orderId);
  return { order: o, line: o.lines.find((x) => x.id === lineId)! };
}
export function executable(status: string) {
  if (!["LIBERADA", "EM_EXECUCAO"].includes(status))
    invalid("Ordem não permite novos apontamentos ou reservas.");
}
export async function saveOrder(actor: Actor, raw: unknown): Promise<OrderDTO> {
  const v = orderSaveSchema.parse(raw);
  return runProductionCommand(actor, "ORDER_SAVE", v, async (tx) => {
    if ((v.origin === "SALE") !== Boolean(v.saleId))
      invalid("Informe a venda somente para ordem de venda.");
    if (v.saleId) {
      await lockProduction(tx, { saleIds: [v.saleId] });
      await activeSale(tx, v.saleId);
    }
    await validatePeople(tx, v.responsibleId, v.lines);
    for (const l of v.lines) {
      if (v.origin === "STOCK" && !l.productId)
        invalid("Produção para estoque exige produto.");
      if (
        l.productId &&
        !(await tx.product.findFirst({
          where: { id: l.productId, active: true },
        }))
      )
        invalid("Produto indisponível.");
      if (v.saleId) {
        const item = await tx.saleItem.findFirst({
          where: { saleId: v.saleId, lineKey: l.saleLineKey ?? "" },
        });
        if (!item || item.productId !== (l.productId ?? null))
          invalid("Produto ou linha incompatível com a venda.");
      } else if (l.saleLineKey)
        invalid("Ordem de estoque não possui linha comercial.");
    }
    const data = {
      origin: v.origin,
      saleId: v.saleId ?? null,
      responsibleId: v.responsibleId ?? null,
      dueDate: v.dueDate ? civilDateToDb(v.dueDate) : null,
      notes: v.notes,
    };
    if (v.id) {
      const o = await lockOrder(tx, v.id);
      if (
        o.version !== v.expectedVersion ||
        o.origin !== v.origin ||
        o.saleId !== data.saleId
      )
        throw conflict();
      if (o.status !== "RASCUNHO")
        invalid(
          "Após liberação, altere responsável e planejamento pela ação específica.",
        );
      await tx.productionLine.deleteMany({ where: { orderId: o.id } });
      await tx.productionOrder.update({
        where: { id: o.id },
        data: {
          ...data,
          version: { increment: 1 },
          lines: {
            create: v.lines.map(({ id: unused, ...l }) => {
              void unused;
              return l;
            }),
          },
        },
      });
      return orderDTO(tx, o.id);
    }
    if (v.expectedVersion !== 0) throw conflict();
    const o = await tx.productionOrder.create({
      data: {
        ...data,
        lines: {
          create: v.lines.map(({ id: unused, ...l }) => {
            void unused;
            return l;
          }),
        },
      },
    });
    return orderDTO(tx, o.id);
  });
}
export async function releaseOrder(
  actor: Actor,
  raw: unknown,
): Promise<OrderDTO> {
  const v = orderActionSchema.parse(raw);
  return runProductionCommand(actor, "ORDER_RELEASE", v, async (tx) => {
    const o = await lockOrder(tx, v.orderId);
    if (o.version !== v.expectedVersion || o.status !== "RASCUNHO")
      throw conflict();
    if (o.saleId) await activeSale(tx, o.saleId);
    await validatePeople(tx, o.responsibleId, o.lines);
    const stocks = await tx.finishedStock.findMany({
      where: {
        productId: {
          in: o.lines.flatMap((l) => (l.productId ? [l.productId] : [])),
        },
      },
    });
    await lockProduction(tx, { finishedIds: stocks.map((s) => s.id) });
    for (const l of o.lines) {
      if (l.productId) {
        const s = await tx.finishedStock.findUnique({
          where: { productId: l.productId },
        });
        if (!s?.active || !s.inventoriedAt)
          invalid(
            "Habilite e inventarie as peças antes de liberar a produção.",
          );
      } else if (o.saleId && l.saleLineKey) {
        await tx.finishedStock.upsert({
          where: {
            ownerSaleId_lineKey: {
              ownerSaleId: o.saleId,
              lineKey: l.saleLineKey,
            },
          },
          create: {
            ownerSaleId: o.saleId,
            lineKey: l.saleLineKey,
            inventoriedAt: new Date(),
          },
          update: {},
        });
      }
    }
    if (o.saleId) {
      for (const key of new Set(o.lines.map((l) => l.saleLineKey!))) {
        const n = o.lines
          .filter((l) => l.saleLineKey === key)
          .reduce((s, l) => s + l.targetUnits, 0);
        if (n > (await demand(tx, o.saleId, key)).remaining)
          invalid("Meta excede a demanda restante da venda.");
      }
    }
    const settings = await tx.pricingSettings.findUnique({ where: { id: 1 } });
    const plannedPrinters: Prisma.JsonObject = {};
    for (const line of o.lines)
      if (line.plannedPrinterId)
        plannedPrinters[line.id] = JSON.parse(
          JSON.stringify(
            await tx.printer.findUniqueOrThrow({
              where: { id: line.plannedPrinterId },
            }),
          ),
        );
    await tx.productionOrder.update({
      where: { id: o.id },
      data: {
        status: "LIBERADA",
        version: { increment: 1 },
        premises: {
          version: settings?.version ?? null,
          values: settings?.values ?? null,
          plannedPrinters,
        },
      },
    });
    if (o.saleId) await projectSale(tx, o.saleId);
    return orderDTO(tx, o.id);
  });
}
export async function findOrderId(lineId: string) {
  const l = await db.productionLine.findUnique({ where: { id: lineId } });
  if (!l) throw new AppError("NOT_FOUND", "Linha não encontrada.");
  return l.orderId;
}
export async function updateOrderPlanning(
  actor: Actor,
  raw: unknown,
): Promise<OrderDTO> {
  const v = orderPlanningSchema.parse(raw);
  return runProductionCommand(actor, "ORDER_PLAN", v, async (tx) => {
    const o = await lockOrder(tx, v.orderId);
    if (o.version !== v.expectedVersion) throw conflict();
    executable(o.status);
    if (
      v.lines.length !== o.lines.length ||
      new Set(v.lines.map((l) => l.lineId)).size !== o.lines.length ||
      v.lines.some((l) => !o.lines.some((x) => x.id === l.lineId))
    )
      invalid("Informe todas as linhas da ordem uma única vez.");
    await validatePeople(
      tx,
      v.responsibleId,
      v.lines.map((l) => ({
        ...l,
        technology: o.lines.find((x) => x.id === l.lineId)!.technology,
      })),
    );
    const premises = (
      o.premises && typeof o.premises === "object" && !Array.isArray(o.premises)
        ? o.premises
        : {}
    ) as Prisma.JsonObject;
    const plannedPrinters = {
      ...((premises.plannedPrinters ?? {}) as Prisma.JsonObject),
    };
    for (const line of v.lines) {
      const old = o.lines.find((l) => l.id === line.lineId)!;
      if (old.plannedPrinterId !== line.plannedPrinterId)
        plannedPrinters[line.lineId] = line.plannedPrinterId
          ? JSON.parse(
              JSON.stringify(
                await tx.printer.findUniqueOrThrow({
                  where: { id: line.plannedPrinterId },
                }),
              ),
            )
          : null;
      await tx.productionLine.update({
        where: { id: line.lineId },
        data: { plannedPrinterId: line.plannedPrinterId },
      });
      await tx.productionEvent.create({
        data: {
          lineId: line.lineId,
          kind: "UPDATE",
          actorId: actor.id,
          reason: v.reason,
          effectiveDate: new Date(),
          premises: {
            planning: {
              before: {
                responsibleId: o.responsibleId,
                dueDate: o.dueDate?.toISOString() ?? null,
                notes: o.notes,
                plannedPrinterId: old.plannedPrinterId,
              },
              after: {
                responsibleId: v.responsibleId,
                dueDate: v.dueDate,
                notes: v.notes,
                plannedPrinterId: line.plannedPrinterId,
              },
            },
          },
        },
      });
    }
    await tx.productionOrder.update({
      where: { id: o.id },
      data: {
        responsibleId: v.responsibleId,
        dueDate: v.dueDate ? civilDateToDb(v.dueDate) : null,
        notes: v.notes,
        premises: { ...premises, plannedPrinters },
        version: { increment: 1 },
      },
    });
    return orderDTO(tx, o.id);
  });
}
