import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { conflict } from "@/lib/errors";
import { artOperationSchema } from "@/domain/art/validation";
import { lockPlanning } from "@/server/planning/coordination";
import { artHash } from "./commands";
import { authorizeArtSession, consumeArtQuota } from "./access";
import { lockArtPackage } from "./revisions";

const schema = z
  .object({
    operationKey: artOperationSchema,
    action: z.enum(["APPROVE", "REQUEST_CHANGES"]),
    name: z.string().trim().min(1).max(160),
    comment: z.string().trim().max(4000),
    confirmedManifestHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
  .refine(
    (v) => v.action !== "REQUEST_CHANGES" || v.comment.length > 0,
    "Descreva os ajustes desejados.",
  );

export async function decideArt(
  sessionToken: string,
  revisionId: string,
  raw: unknown,
) {
  const v = schema.parse(raw);
  const payloadHash = artHash(v);
  // Quota persists on failed decisions as well; no IP headers are trusted.
  await consumeArtQuota("decide-global", 3000, 3600);
  await db.$transaction((tx) =>
    authorizeArtSession(tx, sessionToken, revisionId),
  );
  await consumeArtQuota(`decide:${artHash(sessionToken)}`, 60, 60);
  return db.$transaction(
    async (tx) => {
      await lockPlanning(tx);
      const grant = await authorizeArtSession(tx, sessionToken, revisionId);
      const pkg = await lockArtPackage(tx, grant.revision.packageId);
      const row = await tx.artRevision.findUniqueOrThrow({
        where: { id: revisionId },
        include: { decision: true },
      });
      if (row.decision) {
        if (
          row.decision.operationKey !== v.operationKey ||
          row.decision.payloadHash !== payloadHash
        )
          throw conflict();
        return receipt(row.decision);
      }
      if (
        pkg.currentRevisionId !== revisionId ||
        row.state !== "AWAITING_CUSTOMER" ||
        row.manifestHash !== v.confirmedManifestHash ||
        !row.manifest
      )
        throw conflict();
      const decision = await tx.artDecision.create({
        data: {
          revisionId,
          action: v.action,
          name: v.name,
          comment: v.comment,
          operationKey: v.operationKey,
          manifestHash: row.manifestHash,
          manifest: row.manifest as Prisma.InputJsonValue,
          payloadHash,
        },
      });
      await tx.artRevision.update({
        where: { id: revisionId },
        data: {
          state: v.action === "APPROVE" ? "APPROVED" : "CHANGES_REQUESTED",
          version: { increment: 1 },
        },
      });
      await tx.artEvent.create({
        data: {
          revisionId,
          action: v.action,
          actorName: v.name,
          note: v.comment,
        },
      });
      return receipt(decision);
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
function receipt(row: {
  id: string;
  revisionId: string;
  action: string;
  name: string;
  comment: string;
  manifestHash: string;
  decidedAt: Date;
}) {
  return {
    id: row.id,
    revisionId: row.revisionId,
    action: row.action,
    name: row.name,
    comment: row.comment,
    manifestHash: row.manifestHash,
    decidedAt: row.decidedAt.toISOString(),
  };
}
