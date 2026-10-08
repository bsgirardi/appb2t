import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { lockOperation } from "@/server/commerce/locks";
import type { Meta } from "@/domain/production/types";
export function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
export async function requireProductionActor(actor: Actor) {
  const user = await db.user.findUnique({ where: { id: actor.id } });
  if (!user?.active || user.role !== actor.role)
    throw new AppError("FORBIDDEN", "Acesso não autorizado.");
}
export async function runProductionCommand<T>(
  actor: Actor,
  type: string,
  input: Meta,
  action: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  await requireProductionActor(actor);
  const key = `production:${actor.id}:${input.operationKey}`;
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(canonical(input)))
    .digest("hex");
  return db.$transaction(
    async (tx) => {
      await lockOperation(tx, key);
      const old = await tx.productionCommand.findUnique({ where: { key } });
      if (old) {
        if (old.type !== type || old.payloadHash !== payloadHash)
          throw conflict();
        return old.result as T;
      }
      const result = JSON.parse(JSON.stringify(await action(tx)));
      await tx.productionCommand.create({
        data: { key, type, payloadHash, result, actorId: actor.id },
      });
      return result;
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
