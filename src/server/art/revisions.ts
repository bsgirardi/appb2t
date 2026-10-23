import { Prisma } from "@prisma/client";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import {
  artDraftSchema,
  artDraftUpdateSchema,
  artPackageSchema,
} from "@/domain/art/validation";
import { buildArtManifest } from "@/domain/art/manifest";
import type { ArtManifestLine } from "@/domain/art/types";
import type { CatalogLineSnapshot } from "@/domain/catalog-requests/types";
import { lockCatalogRequest } from "@/server/catalog-requests/service";
import { artHash, runArtCommand } from "./commands";
import { getArtRevision } from "./queries";

export async function lockArtPackage(
  tx: Prisma.TransactionClient,
  packageId: string,
) {
  const pre = await tx.artPackage.findUnique({ where: { id: packageId } });
  if (!pre) throw new AppError("NOT_FOUND", "Pacote de arte não encontrado.");
  await lockCatalogRequest(tx, pre.requestId);
  await tx.$queryRaw`SELECT id FROM "ArtPackage" WHERE id=${packageId} FOR UPDATE`;
  return tx.artPackage.findUniqueOrThrow({ where: { id: packageId } });
}

export function createArtPackage(
  actor: Actor,
  requestId: string,
  raw: unknown,
) {
  const v = artPackageSchema.parse(raw);
  return runArtCommand(
    actor,
    "CREATE_PACKAGE",
    v.operationKey,
    { requestId, ...v },
    async (tx) => {
      await lockCatalogRequest(tx, requestId);
      const rows = await tx.catalogRequestLine.findMany({
        where: { requestId },
      });
      const lines = v.sourceLineIds.map((sourceLineId) => {
        const line = rows
          .map((r) => r.snapshot as unknown as CatalogLineSnapshot)
          .find((l) => l.lineId === sourceLineId);
        if (!line)
          throw new AppError("VALIDATION", "Linha não pertence à solicitação.");
        return { sourceLineId, configurationHash: artHash(line) };
      });
      const existing = await tx.artLineRequirement.findMany({
        where: { requestId, sourceLineId: { in: v.sourceLineIds } },
      });
      if (existing.some((e) => e.packageId)) throw conflict();
      const pkg = await tx.artPackage.create({ data: { requestId } });
      for (const line of lines)
        await tx.artLineRequirement.upsert({
          where: {
            requestId_sourceLineId: {
              requestId,
              sourceLineId: line.sourceLineId,
            },
          },
          create: { requestId, ...line, packageId: pkg.id },
          update: {
            required: true,
            packageId: pkg.id,
            configurationHash: line.configurationHash,
          },
        });
      const revision = await tx.artRevision.create({
        data: {
          packageId: pkg.id,
          number: 1,
          instructions: v.instructions,
          lines,
        },
      });
      await tx.artEvent.create({
        data: {
          revisionId: revision.id,
          action: "CREATE",
          actorId: actor.id,
          actorName: actor.name,
        },
      });
      return getArtRevision(tx, revision.id);
    },
  );
}

export function createArtRevision(
  actor: Actor,
  packageId: string,
  raw: unknown,
) {
  const v = artDraftSchema.parse(raw);
  return runArtCommand(
    actor,
    "CREATE_REVISION",
    v.operationKey,
    { packageId, ...v },
    async (tx) => {
      await lockArtPackage(tx, packageId);
      const count = await tx.artRevision.count({ where: { packageId } });
      if (count >= 20)
        throw new AppError(
          "VALIDATION",
          "Limite de vinte revisões atingido; preserve o histórico e revise o atendimento.",
        );
      const requirements = await tx.artLineRequirement.findMany({
        where: { packageId, required: true },
        orderBy: { sourceLineId: "asc" },
      });
      const lines = requirements.map((r) => ({
        sourceLineId: r.sourceLineId,
        configurationHash: r.configurationHash,
      }));
      const revision = await tx.artRevision.create({
        data: {
          packageId,
          number: count + 1,
          instructions: v.instructions,
          lines,
        },
      });
      return getArtRevision(tx, revision.id);
    },
  );
}

export function updateArtDraft(actor: Actor, revisionId: string, raw: unknown) {
  const v = artDraftUpdateSchema.parse(raw);
  return runArtCommand(
    actor,
    "UPDATE_DRAFT",
    v.operationKey,
    { revisionId, ...v },
    async (tx) => {
      const pre = await tx.artRevision.findUnique({
        where: { id: revisionId },
      });
      if (!pre) throw new AppError("NOT_FOUND", "Revisão não encontrada.");
      await lockArtPackage(tx, pre.packageId);
      const row = await tx.artRevision.findUniqueOrThrow({
        where: { id: revisionId },
      });
      if (row.state !== "DRAFT" || row.version !== v.expectedVersion)
        throw conflict();
      await tx.artRevision.update({
        where: { id: revisionId },
        data: { instructions: v.instructions, version: { increment: 1 } },
      });
      return getArtRevision(tx, revisionId);
    },
  );
}

export function publishRevision(
  actor: Actor,
  revisionId: string,
  expectedVersion: number,
  operationKey: string,
) {
  return runArtCommand(
    actor,
    "PUBLISH",
    operationKey,
    { revisionId, expectedVersion },
    async (tx) => {
      const pre = await tx.artRevision.findUnique({
        where: { id: revisionId },
      });
      if (!pre) throw new AppError("NOT_FOUND", "Revisão não encontrada.");
      const pkg = await lockArtPackage(tx, pre.packageId);
      const row = await tx.artRevision.findUniqueOrThrow({
        where: { id: revisionId },
        include: { files: true },
      });
      if (row.state !== "DRAFT" || row.version !== expectedVersion)
        throw conflict();
      const lines = row.lines as unknown as ArtManifestLine[];
      const requirements = await tx.artLineRequirement.findMany({
        where: { packageId: pkg.id, required: true },
      });
      if (
        requirements.length !== lines.length ||
        lines.some(
          (l) =>
            !requirements.some(
              (r) =>
                r.sourceLineId === l.sourceLineId &&
                r.configurationHash === l.configurationHash,
            ),
        )
      )
        throw conflict();
      const { manifest, hash } = buildArtManifest({
        instructions: row.instructions,
        lines,
        files: row.files.map((f) => ({
          id: f.id,
          purpose: f.purpose as "FINAL" | "REFERENCE",
          sha256: f.sha256,
          previewSha256: f.previewSha256,
        })),
      });
      if (pkg.currentRevisionId) {
        await tx.artRevision.update({
          where: { id: pkg.currentRevisionId },
          data: { state: "SUPERSEDED", version: { increment: 1 } },
        });
        await tx.artAccessGrant.updateMany({
          where: { revisionId: pkg.currentRevisionId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await tx.artRevision.update({
        where: { id: revisionId },
        data: {
          state: "AWAITING_CUSTOMER",
          manifest: manifest as unknown as Prisma.InputJsonValue,
          manifestHash: hash,
          publishedAt: new Date(),
          version: { increment: 1 },
        },
      });
      await tx.artPackage.update({
        where: { id: pkg.id },
        data: { currentRevisionId: revisionId },
      });
      await tx.artEvent.create({
        data: {
          revisionId,
          action: "PUBLISH",
          actorId: actor.id,
          actorName: actor.name,
        },
      });
      return getArtRevision(tx, revisionId);
    },
  );
}
