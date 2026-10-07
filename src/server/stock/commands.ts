import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { lockOperation } from "@/server/commerce/locks";
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v)
        .filter(([, x]) => x !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, x]) => [k, canonical(x)]),
    );
  return v;
}
export async function runStockCommand<T>(
  actor: Actor,
  type: string,
  raw: unknown,
  action: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const user = await db.user.findUnique({ where: { id: actor.id } });
  if (!user?.active || user.role !== actor.role)
    throw new AppError("FORBIDDEN", "Acesso não autorizado.");
  const input = raw as { operationKey: string };
  if (!input.operationKey)
    throw new AppError("VALIDATION", "Informe a chave da operação.");
  const key = `stock:${actor.id}:${input.operationKey}`,
    payloadHash = createHash("sha256")
      .update(JSON.stringify(canonical(raw)))
      .digest("hex");
  return db.$transaction(
    async (tx) => {
      await lockOperation(tx, key);
      const old = await tx.stockCommand.findUnique({ where: { key } });
      if (old) {
        if (old.type !== type || old.payloadHash !== payloadHash)
          throw conflict();
        return old.result as T;
      }
      const result = JSON.parse(JSON.stringify(await action(tx)));
      await tx.stockCommand.create({
        data: { key, type, payloadHash, result, actorId: actor.id },
      });
      return result;
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
export async function lockStockItems(
  tx: Prisma.TransactionClient,
  ids: string[],
): Promise<void> {
  for (const id of [...new Set(ids)].sort())
    await tx.$queryRaw`SELECT id FROM "StockItem" WHERE id=${id} FOR UPDATE`;
}
