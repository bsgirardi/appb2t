import { createHash } from "node:crypto";
import { taxEvidence } from "@/server/tax/profiles";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { resolvePricingRequest } from "../resolve";
import { previewComparison } from "@/domain/pricing/comparisons/calculate";
import { comparisonDraftSchema } from "@/domain/pricing/comparisons/validation";
import { assertComparisonActor, readComparison } from "./read";
const json = (v: unknown) => v as Prisma.InputJsonValue;
export async function createPricingComparison(
  actor: Actor,
  raw: unknown,
  operationKey: string,
) {
  assertComparisonActor(actor);
  const draft = comparisonDraftSchema.parse(raw);
  z.uuid().parse(operationKey);
  const hash = createHash("sha256").update(JSON.stringify(draft)).digest("hex");
  const where = { actorId_operationKey: { actorId: actor.id, operationKey } };
  const replay = async (row: { id: string; requestHash: string }) => {
    if (row.requestHash !== hash) throw conflict();
    return readComparison(db, row.id);
  };
  const previous = await db.pricingComparison.findUnique({ where });
  if (previous) return replay(previous);
  try {
    return await db.$transaction(
      async (tx) => {
        // Hold referenced catalog rows stable through resolution and commit.
        await tx.$queryRaw`SELECT "id" FROM "PricingSettings" WHERE "id" = 1 FOR SHARE`;
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "Material" WHERE "id" IN (${Prisma.join(draft.request.materials.map((m) => m.ref.id))}) ORDER BY "id" FOR SHARE`,
        );
        await tx.$queryRaw`SELECT "id" FROM "Printer" WHERE "id" = ${draft.request.printerRef.id} FOR SHARE`;
        if (draft.request.extras.length)
          await tx.$queryRaw(
            Prisma.sql`SELECT "id" FROM "PricingExtra" WHERE "id" IN (${Prisma.join(draft.request.extras.map((e) => e.ref.id))}) ORDER BY "id" FOR SHARE`,
          );
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "PricingChannel" WHERE "id" IN (${Prisma.join(draft.alternatives.map((a) => a.channelRef.id))}) ORDER BY "id" FOR SHARE`,
        );
        const values = [];
        for (const a of draft.alternatives) {
          const input = await resolvePricingRequest(tx, actor, {
            ...draft.request,
            channelRef: a.channelRef,
            mode: "INFORMED",
          });
          const preview = previewComparison(
            { ...input, mode: draft.request.mode },
            [{ ...input.channel, ...input.channel.ref, active: true }],
            draft.reference,
            [a],
          ).alternatives[0];
          if (preview.status !== "VALID")
            throw new AppError("VALIDATION", preview.message);
          values.push(preview.value);
        }
        const comparison = await tx.pricingComparison.create({
          data: {
            name: draft.name,
            actorId: actor.id,
            actorName: actor.name,
            operationKey,
            requestHash: hash,
            context: json({
              reference: draft.reference,
              originalMode: draft.request.mode,
              settingsVersion: draft.request.expectedSettingsVersion,
              quantity: draft.request.quantity,
            }),
          },
        });
        for (const [position, value] of values.entries()) {
          const snapshot = await tx.pricingSnapshot.create({
            data: {
              actorId: actor.id,
              actorName: actor.name,
              operationKey: `comparison:${comparison.id}:${position}`,
              requestHash: hash,
              input: json(value.input),
              taxEvidence: await taxEvidence(tx, value.input.tax?.profile?.id),
              result: json(value.result),
            },
          });
          await tx.pricingComparisonItem.create({
            data: {
              comparisonId: comparison.id,
              position,
              snapshotId: snapshot.id,
              context: json({
                channelRef: value.channelRef,
                discountPercent: value.discountPercent,
                metrics: value.metrics,
              }),
            },
          });
        }
        return readComparison(tx, comparison.id);
      },
      { isolationLevel: "RepeatableRead", timeout: 15000 },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        const winner = await db.pricingComparison.findUnique({ where });
        if (winner) return replay(winner);
      }
      if (
        e.code === "P2034" ||
        (e.code === "P2010" && e.meta?.code === "40001")
      )
        throw conflict();
    }
    throw e;
  }
}
