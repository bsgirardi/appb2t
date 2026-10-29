import { Prisma } from "@prisma/client";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { AppError, conflict } from "@/lib/errors";
import { saleCommandSchema } from "@/domain/consignment/validation";
import { calculateConsignmentLines } from "@/domain/consignment/commercial";
import { civilDateToDb, todaySaoPaulo } from "@/domain/commerce/dates";
import { createDocumentSnapshot } from "@/server/commerce/snapshots";
import type { DocumentInput } from "@/domain/commerce/types";
import { runConsignmentCommand } from "./commands";
import { requireConsignmentActor } from "./authorization";
import { lockConsignment } from "./locks";
import { partnerRow } from "./partners";
import { allocationBalance } from "./custody";
import {
  createConsignmentObligations,
  readConsignmentReceiptSummary,
} from "./finance";
import { lockCommerce } from "@/server/commerce/locks";
const invalid = (message: string): never => {
  throw new AppError("VALIDATION", message);
};
export async function consignmentSaleRow(
  tx: Prisma.TransactionClient,
  id: string,
) {
  const sale = await tx.consignmentSale.findUnique({
    where: { id },
    include: {
      lines: {
        orderBy:{id:"asc"},
        include: { allocations: {orderBy:{id:"asc"}}, product: { select: { name: true } } },
      },
      financialLinks: {orderBy:{role:"asc"}},
    },
  });
  if (!sale)
    throw new AppError("NOT_FOUND", "Venda consignada não encontrada.");
  return sale;
}
export async function consignmentSaleDTO(
  tx: Prisma.TransactionClient,
  id: string,
) {
  const s = await consignmentSaleRow(tx, id);
  return {
    ...s,
    effectiveDate: s.effectiveDate.toISOString().slice(0, 10),
    createdAt: s.createdAt.toISOString(),
    lines: s.lines.map((l) => ({
      ...l,
      unitPrice: l.unitPrice.toFixed(2),
      percent: l.percent.toFixed(),
      gross: l.gross?.toFixed(2) ?? null,
      commission: l.commission?.toFixed(2) ?? null,
    })),
    finance: s.saleId
      ? await readConsignmentReceiptSummary(tx, s.saleId)
      : null,
  };
}
export type ConsignmentSaleDTO = Awaited<ReturnType<typeof consignmentSaleDTO>>;
export async function executeConsignmentSaleCommand(
  actor: Actor,
  raw: unknown,
): Promise<ConsignmentSaleDTO> {
  const v = saleCommandSchema.parse(raw);
  if (v.type !== "SAVE_DRAFT") assertAdmin(actor);
  return runConsignmentCommand(actor, "SALE_" + v.type, v, async (tx) => {
    if (v.type !== "SAVE_DRAFT") await requireConsignmentActor(tx, actor, true);
    if (v.type === "SAVE_DRAFT") {
      if (v.effectiveDate > todaySaoPaulo(new Date()))
        invalid("Venda efetiva não pode ter data futura.");
      await lockConsignment(tx, {
        partnerId: v.partnerId,
        consignmentSaleIds: v.id ? [v.id] : [],
      });
      const p = await partnerRow(tx, v.partnerId);
      const old = v.id ? await consignmentSaleRow(tx, v.id) : null;
      if (
        old
          ? old.partnerId !== p.id ||
            old.status !== "DRAFT" ||
            old.version !== v.expectedVersion
          : v.expectedVersion !== 0
      )
        throw conflict();
      if (new Set(v.lines.map((l) => l.productId)).size !== v.lines.length)
        invalid("Produto repetido.");
      const allAllocations = v.lines.flatMap((l) =>
        l.allocations.map((a) => a.shipmentAllocationId),
      );
      if (new Set(allAllocations).size !== allAllocations.length)
        invalid("Alocação repetida.");
      for (const l of v.lines) {
        const condition = p.conditions.find((c) => c.productId === l.productId),
          percent = condition?.percent?.toFixed() ?? p.percent.toFixed();
        if (
          (v.model !== p.model || l.percent !== percent) &&
          (actor.role !== "ADMIN" || v.overrideReason.length < 3)
        )
          invalid("Revisão de comissão exige administrador e motivo.");
        if (l.allocations.reduce((n, a) => n + a.units, 0) !== l.quantity)
          invalid("Distribuição difere da quantidade vendida.");
        for (const a of l.allocations) {
          const allocation = await tx.consignmentShipmentAllocation.findUnique({
            where: { id: a.shipmentAllocationId },
            include: { line: { include: { shipment: true } } },
          });
          if (
            !allocation ||
            allocation.line.productId !== l.productId ||
            allocation.line.shipment.partnerId !== p.id ||
            a.units >
              (await allocationBalance(tx, a.shipmentAllocationId)).partner
          )
            invalid("Peças não recebidas ou de outro parceiro/produto.");
        }
      }
      if (v.replacesId) {
        const prior = await tx.consignmentSale.findUnique({
          where: { id: v.replacesId },
        });
        if (!prior || prior.status !== "CANCELED" || prior.partnerId !== p.id)
          invalid("Substitua uma venda cancelada do mesmo parceiro.");
      }
      const totals = calculateConsignmentLines(
        v.lines.map((l) => ({ ...l, model: v.model })),
      );
      const data = {
        partnerId: p.id,
        reference: v.reference,
        effectiveDate: civilDateToDb(v.effectiveDate),
        model: v.model,
        dueDay: p.dueDay,
        notes: v.notes,
        actorId: actor.id,
        replacesId: v.replacesId ?? null,
        totals: totals as unknown as Prisma.InputJsonValue,
        snapshot: { overrideReason: v.overrideReason },
      };
      const s = old
        ? await tx.consignmentSale.update({
            where: { id: old.id },
            data: { ...data, version: { increment: 1 } },
          })
        : await tx.consignmentSale.create({ data });
      if (old) {
        await tx.consignmentSaleAllocation.deleteMany({
          where: { line: { consignmentSaleId: s.id } },
        });
        await tx.consignmentSaleLine.deleteMany({
          where: { consignmentSaleId: s.id },
        });
      }
      for (const l of v.lines)
        await tx.consignmentSaleLine.create({
          data: {
            consignmentSaleId: s.id,
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            percent: l.percent,
            allocations: { create: l.allocations },
          },
        });
      await tx.consignmentEvent.create({
        data: {
          partnerId: p.id,
          consignmentSaleId: s.id,
          kind: "SALE_DRAFT",
          actorId: actor.id,
          actorName: actor.name,
          effectiveDate: civilDateToDb(v.effectiveDate),
          reason: v.overrideReason,
        },
      });
      return consignmentSaleDTO(tx, s.id);
    }
    const pre = await consignmentSaleRow(tx, v.id);
    await lockConsignment(tx, {
      partnerId: pre.partnerId,
      consignmentSaleIds: [v.id],
    });
    const s = await consignmentSaleRow(tx, v.id);
    if (s.version !== v.expectedVersion) throw conflict();
    if (v.type === "CANCEL")
      return cancelConsignmentSaleWithClient(
        tx,
        actor,
        s.id,
        v.expectedVersion,
        v.reason,
      );
    if (s.status !== "DRAFT") invalid("Venda já confirmada ou cancelada.");
    const p = await partnerRow(tx, s.partnerId);
    if (s.dueDay !== p.dueDay) throw conflict();
    const override =
      (s.snapshot as { overrideReason?: string } | null)?.overrideReason ?? "";
    if (
      (s.model !== p.model ||
        s.lines.some(
          (l) =>
            l.percent.toFixed() !==
            (p.conditions
              .find((c) => c.productId === l.productId)
              ?.percent?.toFixed() ?? p.percent.toFixed()),
        )) &&
      override.length < 3
    )
      invalid(
        "As condições do parceiro mudaram. Revise o rascunho antes de confirmar.",
      );
    for (const l of s.lines)
      for (const a of l.allocations)
        if (
          a.units >
          (await allocationBalance(tx, a.shipmentAllocationId)).partner
        )
          invalid("Saldo recebido insuficiente.");
    const totals = calculateConsignmentLines(
      s.lines.map((l) => ({
        quantity: l.quantity,
        unitPrice: l.unitPrice.toFixed(2),
        percent: l.percent.toFixed(),
        model: s.model,
      })),
    );
    const document: DocumentInput = {
      customerId: p.customerId,
      items: s.lines.map((l) => ({
        lineId: l.id,
        productId: l.productId,
        description: l.product.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice.toFixed(2),
      })),
      discount: "0.00",
      shipping: "0.00",
      paymentTerms:
        s.model === "RETIDA"
          ? "Repasse líquido com comissão retida"
          : "Repasse integral e comissão separada",
      internalNotes: s.notes,
    };
    const regular = await tx.sale.create({
      data: {
        customerId: p.customerId,
        status: "ENTREGUE",
        fulfillmentMode: "CONSIGNMENT",
        document: document as unknown as Prisma.InputJsonValue,
        totals: {
          subtotal: totals.gross,
          discount: "0.00",
          shipping: "0.00",
          total: totals.gross,
        },
      },
    });
    const { snapshot, logo } = await createDocumentSnapshot(
      tx,
      document,
      `/api/sales/${regular.id}/logo`,
      undefined,
      { consignmentCustody: true },
    );
    await tx.sale.update({
      where: { id: regular.id },
      data: { snapshot: snapshot as unknown as Prisma.InputJsonValue },
    });
    if (logo)
      await tx.documentLogo.create({
        data: {
          saleId: regular.id,
          bytes: new Uint8Array(logo.bytes),
          mimeType: logo.mimeType,
        },
      });
    await tx.saleItem.createMany({
      data: s.lines.map((l, position) => ({
        saleId: regular.id,
        lineKey: l.id,
        position,
        productId: l.productId,
        description: l.product.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
    });
    await tx.consignmentSale.update({
      where: { id: s.id },
      data: {
        saleId: regular.id,
        status: "CONFIRMED",
        version: { increment: 1 },
        snapshot: JSON.parse(
          JSON.stringify({
            customer: p.customer,
            location: p.location,
            model: s.model,
            override: s.snapshot,
          }),
        ),
        totals: totals as unknown as Prisma.InputJsonValue,
      },
    });
    for (let i = 0; i < s.lines.length; i++)
      await tx.consignmentSaleLine.update({
        where: { id: s.lines[i].id },
        data: {
          gross: totals.lines[i].gross,
          commission: totals.lines[i].commission,
        },
      });
    await tx.commerceEvent.create({
      data: {
        saleId: regular.id,
        action: "CONFIRM",
        actorId: actor.id,
        actorName: actor.name,
        reason: `Consignação · data efetiva ${s.effectiveDate.toISOString().slice(0, 10)}`,
      },
    });
    const e = await tx.consignmentEvent.create({
      data: {
        partnerId: p.id,
        consignmentSaleId: s.id,
        kind: "SALE",
        fromStage: "partner",
        toStage: "sold",
        effectiveDate: s.effectiveDate,
        actorId: actor.id,
        actorName: actor.name,
        reason: v.reason,
      },
    });
    for (const l of s.lines)
      for (const a of l.allocations) {
        await tx.consignmentEventAllocation.create({
          data: {
            eventId: e.id,
            shipmentAllocationId: a.shipmentAllocationId,
            units: a.units,
          },
        });
        await allocationBalance(tx, a.shipmentAllocationId);
      }
    await createConsignmentObligations(tx, actor, regular.id);
    return consignmentSaleDTO(tx, s.id);
  });
}
export async function cancelConsignmentSaleWithClient(
  tx: Prisma.TransactionClient,
  actor: Actor,
  id: string,
  expectedVersion: number,
  reason: string,
): Promise<ConsignmentSaleDTO> {
  const s = await consignmentSaleRow(tx, id);
  if (s.version !== expectedVersion) throw conflict();
  if (s.status !== "CONFIRMED" || !s.saleId)
    invalid("Cancele somente uma venda confirmada.");
  if (
    await tx.consignmentStatementLine.findFirst({
      where: { consignmentSaleId: id, active: true },
    })
  )
    invalid("Cancele o acerto antes da venda.");
  await lockCommerce(tx, {
    saleId: s.saleId!,
    entryIds: s.financialLinks.map((l) => l.entryId),
  });
  for (const l of s.financialLinks) {
    const active = await tx.settlement.findFirst({
      where: { entryId: l.entryId, movement: { is: { reversedBy: null } } },
    });
    if (active) invalid("Estorne as baixas antes de cancelar a venda.");
  }
  await tx.financialEntry.updateMany({
    where: { id: { in: s.financialLinks.map((l) => l.entryId) } },
    data: { canceledAt: new Date(), version: { increment: 1 } },
  });
  for (const l of s.financialLinks)
    await tx.financialAuditEvent.create({
      data: {
        entityType: "ENTRY",
        entityId: l.entryId,
        action: "CONSIGNMENT_CANCEL",
        actorId: actor.id,
        actorName: actor.name,
        reason,
        changes: { consignmentSaleId: s.id },
      },
    });
  const e = await tx.consignmentEvent.create({
    data: {
      partnerId: s.partnerId,
      consignmentSaleId: s.id,
      kind: "SALE_CANCEL",
      fromStage: "sold",
      toStage: "partner",
      effectiveDate: s.effectiveDate,
      actorId: actor.id,
      actorName: actor.name,
      reason,
    },
  });
  for (const l of s.lines)
    for (const a of l.allocations)
      await tx.consignmentEventAllocation.create({
        data: {
          eventId: e.id,
          shipmentAllocationId: a.shipmentAllocationId,
          units: a.units,
        },
      });
  await tx.consignmentSale.update({
    where: { id },
    data: { status: "CANCELED", version: { increment: 1 } },
  });
  await tx.sale.update({
    where: { id: s.saleId! },
    data: { status: "CANCELADA", version: { increment: 1 } },
  });
  await tx.commerceEvent.create({
    data: {
      saleId: s.saleId!,
      action: "CANCEL",
      actorId: actor.id,
      actorName: actor.name,
      reason,
    },
  });
  return consignmentSaleDTO(tx, id);
}
