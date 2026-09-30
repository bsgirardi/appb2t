import type { Prisma, CashMovement } from "@prisma/client";
import type { Actor } from "../auth/session";
import type { MovementDTO } from "@/domain/finance/types";
import { civilDateFromDb } from "@/domain/commerce/dates";
export async function audit(
  tx: Prisma.TransactionClient,
  actor: Actor,
  entityType: string,
  entityId: string,
  action: string,
  changes: Prisma.InputJsonValue = {},
  reason = "",
) {
  await tx.financialAuditEvent.create({
    data: {
      entityType,
      entityId,
      action,
      changes,
      reason,
      actorId: actor.id,
      actorName: actor.name,
    },
  });
}
export function movementDTO(m: CashMovement): MovementDTO {
  return {
    id: m.id,
    accountId: m.accountId,
    categoryId: m.categoryId,
    amount: m.amount.toFixed(2),
    effectiveDate: civilDateFromDb(m.effectiveDate),
    kind: m.kind,
    description: m.description,
    actorName: m.actorName,
    settlementId: m.settlementId,
    transferId: m.transferId,
    reversalOfId: m.reversalOfId,
    createdAt: m.createdAt.toISOString(),
  };
}
