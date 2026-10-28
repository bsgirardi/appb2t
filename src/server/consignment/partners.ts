import type { Prisma } from "@prisma/client";
import type { Actor } from "@/server/auth/session";
import { AppError, conflict } from "@/lib/errors";
import { partnerCommandSchema } from "@/domain/consignment/validation";
import { runConsignmentCommand } from "./commands";
import { lockConsignment } from "./locks";
import { requireConsignmentActor } from "./authorization";
import { assertAdmin } from "@/server/auth/authorization";
export async function partnerRow(tx: Prisma.TransactionClient, id: string) {
  const partner = await tx.partner.findUnique({
    where: { id },
    include: { customer: true, conditions: true },
  });
  if (!partner) throw new AppError("NOT_FOUND", "Parceiro não encontrado.");
  return partner;
}
export async function partnerDTO(tx: Prisma.TransactionClient, id: string) {
  const p = await partnerRow(tx, id);
  return {
    ...p,
    percent: p.percent.toFixed(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    customer: {
      id: p.customer.id,
      name: p.customer.name,
      active: p.customer.active,
    },
    conditions: p.conditions.map((c) => ({
      ...c,
      percent: c.percent?.toFixed() ?? null,
    })),
  };
}
export type PartnerDTO = Awaited<ReturnType<typeof partnerDTO>>;
export async function executePartnerCommand(
  actor: Actor,
  raw: unknown,
): Promise<PartnerDTO> {
  assertAdmin(actor);
  const v = partnerCommandSchema.parse(raw);
  return runConsignmentCommand(actor, "PARTNER_" + v.type, v, async (tx) => {
    await requireConsignmentActor(tx, actor, true);
    if (v.type === "CREATE") {
      if (v.expectedVersion !== 0) throw conflict();
      const customer = await tx.customer.findUnique({
        where: { id: v.customerId },
      });
      const responsible = await tx.user.findFirst({
        where: { id: v.responsibleId, active: true },
      });
      if (!customer?.active || !responsible)
        throw new AppError(
          "VALIDATION",
          "Selecione cliente e responsável ativos.",
        );
      if (await tx.partner.findUnique({ where: { customerId: v.customerId } }))
        throw conflict();
      const p = await tx.partner.create({
        data: {
          customerId: v.customerId,
          responsibleId: v.responsibleId,
          location: v.location,
          model: v.model,
          percent: v.percent,
          dueDay: v.dueDay,
          notes: v.notes,
        },
      });
      await tx.consignmentEvent.create({
        data: {
          partnerId: p.id,
          kind: "PARTNER_CREATE",
          actorId: actor.id,
          actorName: actor.name,
          effectiveDate: new Date(),
          changes: JSON.parse(JSON.stringify(v)),
        },
      });
      return partnerDTO(tx, p.id);
    }
    await lockConsignment(tx, { partnerId: v.id });
    const old = await partnerRow(tx, v.id);
    if (old.version !== v.expectedVersion) throw conflict();
    if (v.type === "UPDATE") {
      if (
        v.responsibleId !== old.responsibleId &&
        !(await tx.user.findFirst({
          where: { id: v.responsibleId, active: true },
        }))
      )
        throw new AppError("VALIDATION", "Selecione responsável ativo.");
      await tx.partner.update({
        where: { id: v.id },
        data: {
          responsibleId: v.responsibleId,
          location: v.location,
          model: v.model,
          percent: v.percent,
          dueDay: v.dueDay,
          notes: v.notes,
          active: v.active,
          version: { increment: 1 },
        },
      });
    } else {
      if (!(await tx.product.findUnique({ where: { id: v.productId } })))
        throw new AppError("VALIDATION", "Produto não encontrado.");
      await tx.partnerProductCondition.upsert({
        where: {
          partnerId_productId: { partnerId: v.id, productId: v.productId },
        },
        create: {
          partnerId: v.id,
          productId: v.productId,
          percent: v.percent,
          minimum: v.minimum,
        },
        update: { percent: v.percent, minimum: v.minimum },
      });
      await tx.partner.update({
        where: { id: v.id },
        data: { version: { increment: 1 } },
      });
    }
    await tx.consignmentEvent.create({
      data: {
        partnerId: v.id,
        kind: v.type,
        actorId: actor.id,
        actorName: actor.name,
        effectiveDate: new Date(),
        changes: JSON.parse(
          JSON.stringify({ before: await partnerDTOFromRow(old), command: v }),
        ),
      },
    });
    return partnerDTO(tx, v.id);
  });
}
async function partnerDTOFromRow(p: Awaited<ReturnType<typeof partnerRow>>) {
  return {
    model: p.model,
    percent: p.percent.toFixed(),
    dueDay: p.dueDay,
    active: p.active,
    responsibleId: p.responsibleId,
    location: p.location,
    notes: p.notes,
  };
}
