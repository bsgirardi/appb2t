import { createHash } from "node:crypto";
import { Prisma, type PricingSnapshot } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "../auth/session";
import {
  pricingRequestSchema,
  pricingV2Schema,
} from "@/domain/pricing/validation";
import { calculateV2 } from "@/domain/pricing/calculate";
import type {
  PricingSnapshotDTO,
  PricingV2Result,
} from "@/domain/pricing/types";
import { resolvePricingRequest } from "./resolve";
function dto(row: PricingSnapshot): PricingSnapshotDTO {
  return {
    id: row.id,
    version: 2,
    input: pricingV2Schema.parse(row.input),
    result: row.result as unknown as PricingV2Result,
    createdAt: row.createdAt.toISOString(),
    actorId: row.actorId,
    actorName: row.actorName,
  };
}
export async function getPricingSnapshot(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<PricingSnapshotDTO> {
  const row = await tx.pricingSnapshot.findUnique({ where: { id } });
  if (!row) throw new AppError("NOT_FOUND", "Estimativa não encontrada.");
  return dto(row);
}
export async function createPricingEstimate(
  actor: Actor,
  raw: unknown,
  operationKey: string,
): Promise<PricingSnapshotDTO> {
  const request = pricingRequestSchema.parse(raw);
  z.uuid().parse(operationKey);
  const hash = createHash("sha256")
    .update(JSON.stringify(request))
    .digest("hex");
  const where = { actorId_operationKey: { actorId: actor.id, operationKey } };
  const replay = (row: PricingSnapshot) => {
    if (row.requestHash !== hash) throw conflict();
    return dto(row);
  };
  const previous = await db.pricingSnapshot.findUnique({ where });
  if (previous) return replay(previous);
  try {
    return await db.$transaction(
      async (tx) => {
        const input = await resolvePricingRequest(tx, actor, request),
          result = calculateV2(input);
        return dto(
          await tx.pricingSnapshot.create({
            data: {
              input: input as unknown as Prisma.InputJsonValue,
              result: result as unknown as Prisma.InputJsonValue,
              actorId: actor.id,
              actorName: actor.name,
              operationKey,
              requestHash: hash,
            },
          }),
        );
      },
      { isolationLevel: "RepeatableRead" },
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const winner = await db.pricingSnapshot.findUnique({ where });
      if (winner) return replay(winner);
    }
    throw e;
  }
}
