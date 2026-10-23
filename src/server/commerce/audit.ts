import type { Prisma } from "@prisma/client";
import type { Actor } from "../auth/session";
import type { CommerceAuthor } from "./sale-write";
export function commerceAuthorship(author: Actor | CommerceAuthor) {
  if ("kind" in author)
    return author.kind === "CHECKOUT"
      ? {
          authorKind: "CHECKOUT",
          actorId: null,
          actorName: author.name,
          checkoutId: author.checkoutId,
        }
      : {
          authorKind: "ADMIN",
          actorId: author.actor.id,
          actorName: author.actor.name,
          checkoutId: null,
        };
  return {
    authorKind: "ADMIN",
    actorId: author.id,
    actorName: author.name,
    checkoutId: null,
  };
}
export async function quoteEvent(
  tx: Prisma.TransactionClient,
  actor: Actor | CommerceAuthor,
  quoteId: string,
  action: string,
  reason = "",
) {
  await tx.commerceEvent.create({
    data: { quoteId, action, reason, ...commerceAuthorship(actor) },
  });
}
