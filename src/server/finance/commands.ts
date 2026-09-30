import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { conflict } from "@/lib/errors";
import { assertAdmin } from "../auth/authorization";
import type { Actor } from "../auth/session";
import { lockOperation } from "../commerce/locks";
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
export async function runFinanceCommand<T>(
  actor: Actor,
  key: string,
  type: string,
  payload: unknown,
  action: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  assertAdmin(actor);
  const operationKey = `finance:${z.string().min(8).max(160).parse(key)}`,
    payloadHash = createHash("sha256")
      .update(JSON.stringify(canonical(payload)))
      .digest("hex");
  return db.$transaction(
    async (tx) => {
      await lockOperation(tx, operationKey);
      const old = await tx.financeCommand.findUnique({
        where: { key: operationKey },
      });
      if (old) {
        if (old.type !== type || old.payloadHash !== payloadHash)
          throw conflict();
        return old.result as T;
      }
      const result = await action(tx);
      await tx.financeCommand.create({
        data: {
          key: operationKey,
          type,
          payloadHash,
          result: result as Prisma.InputJsonValue,
          actorId: actor.id,
        },
      });
      return result;
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
