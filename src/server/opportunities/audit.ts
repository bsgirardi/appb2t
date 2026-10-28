import type { Prisma } from "@prisma/client";
import type { CommerceAuthor } from "@/server/commerce/sale-write";
import type { Actor } from "@/server/auth/session";
import { commerceAuthorship } from "@/server/commerce/audit";
export async function opportunityEvent(
  tx: Prisma.TransactionClient,
  author: Actor | CommerceAuthor,
  id: string,
  type: string,
  data: Prisma.InputJsonValue,
) {
  const attribution = commerceAuthorship(author);
  return tx.opportunityEvent.create({
    data: {
      opportunityId: id,
      type,
      authorKind:
        attribution.authorKind === "CHECKOUT"
          ? "CHECKOUT"
          : "kind" in author
            ? author.kind === "ADMIN"
              ? author.actor.role
              : "CHECKOUT"
            : author.role,
      actorId: attribution.actorId,
      actorName: attribution.actorName,
      data,
    },
  });
}
