import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { lockOperation } from "@/server/commerce/locks";
import { lockPlanning } from "@/server/planning/coordination";
import { canonical } from "@/server/production/commands";
import { artOperationSchema } from "@/domain/art/validation";

export function artHash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

// Global order: operation -> planning -> request -> commerce/production -> art.
// All later revision, decision and production paths must preserve this order.
export async function runArtCommand<T>(
  actor: Actor,
  type: string,
  operationKey: string,
  payload: unknown,
  action: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  artOperationSchema.parse(operationKey);
  const key = `art:${actor.id}:${operationKey}`;
  const payloadHash = artHash(payload);
  return db.$transaction(
    async (tx) => {
      const users = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "User" WHERE id=${actor.id} AND active=true AND role::text=${actor.role} FOR SHARE`;
      if (!users.length)
        throw new AppError("FORBIDDEN", "Acesso não autorizado.");
      await lockOperation(tx, key);
      await lockPlanning(tx);
      const previous = await tx.artCommand.findUnique({ where: { key } });
      if (previous) {
        if (previous.type !== type || previous.payloadHash !== payloadHash)
          throw conflict();
        return previous.result as T;
      }
      const result = JSON.parse(JSON.stringify(await action(tx)));
      await tx.artCommand.create({
        data: { key, actorId: actor.id, type, payloadHash, result },
      });
      return result as T;
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
