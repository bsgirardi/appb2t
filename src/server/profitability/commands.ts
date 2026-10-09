import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { lockOperation } from "@/server/commerce/locks";
import { canonical } from "@/server/production/commands";
import { requireProfitabilityAdmin } from "./authorization";
export const factsHash = (v: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(JSON.parse(JSON.stringify(v)))))
    .digest("hex");
export async function runProfitabilityCommand<T>(
  actor: Actor,
  type: string,
  input: { operationKey: string },
  action: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  await requireProfitabilityAdmin(actor);
  const key = `profitability:${actor.id}:${input.operationKey}`,
    payloadHash = factsHash(input);
  return db.$transaction(
    async (tx) => {
      await lockOperation(tx, key);
      const previous = await tx.profitabilityCommand.findUnique({
        where: { key },
      });
      if (previous) {
        if (previous.type !== type || previous.payloadHash !== payloadHash)
          throw conflict();
        return previous.result as T;
      }
      const result = JSON.parse(JSON.stringify(await action(tx)));
      await tx.profitabilityCommand.create({
        data: { key, type, payloadHash, actorId: actor.id, result },
      });
      return result;
    },
    { timeout: 30000, maxWait: 10000 },
  );
}
