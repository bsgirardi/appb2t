import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import type { PlanningMeta } from "@/domain/planning/types";
import {
  canonical,
  requireProductionActor,
} from "@/server/production/commands";
import { lockOperation } from "@/server/commerce/locks";
import { lockPlanning } from "./coordination";
export function admin(actor: Actor) {
  if (actor.role !== "ADMIN")
    throw new AppError(
      "FORBIDDEN",
      "Apenas administrador pode configurar ou corrigir o planejamento.",
    );
}
export async function runPlanningCommand<T>(
  actor: Actor,
  type: string,
  input: PlanningMeta,
  action: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  await requireProductionActor(actor);
  const key = `planning:${actor.id}:${input.operationKey}`,
    payloadHash = createHash("sha256")
      .update(JSON.stringify(canonical(input)))
      .digest("hex");
  return db.$transaction(
    async (tx) => {
      await lockOperation(tx, key);
      const revision = await lockPlanning(tx);
      const user = await tx.user.findUnique({ where: { id: actor.id } });
      if (!user?.active || user.role !== actor.role)
        throw new AppError("FORBIDDEN", "Acesso não autorizado.");
      const old = await tx.planningCommand.findUnique({ where: { key } });
      if (old) {
        if (old.type !== type || old.payloadHash !== payloadHash)
          throw conflict();
        return old.result as T;
      }
      if (revision !== input.expectedRevision) throw conflict();
      const result = JSON.parse(JSON.stringify(await action(tx)));
      await tx.planningState.update({
        where: { id: 1 },
        data: { revision: { increment: 1 } },
      });
      await tx.planningAudit.create({
        data: {
          revision: revision + 1,
          action: type,
          actorId: actor.id,
          before: JSON.parse(JSON.stringify(input)),
          after: result,
        },
      });
      await tx.planningCommand.create({
        data: { key, type, payloadHash, result, actorId: actor.id },
      });
      return result as T;
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
