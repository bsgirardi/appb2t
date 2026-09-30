import type { Prisma } from "@prisma/client";
import type { Actor } from "../auth/session";
export async function quoteEvent(
  tx: Prisma.TransactionClient,
  actor: Actor,
  quoteId: string,
  action: string,
  reason = "",
) {
  await tx.commerceEvent.create({
    data: { quoteId, action, reason, actorId: actor.id, actorName: actor.name },
  });
}
