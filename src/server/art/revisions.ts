import { Prisma } from "@prisma/client";
import { z } from "zod";
import { artOperationSchema } from "@/domain/art/validation";
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
import type {
  DocumentItemInput,
  QuoteDraftInput,
  DocumentInput,
} from "@/domain/commerce/types";
import { lockCatalogRequest } from "@/server/catalog-requests/service";
import { runArtCommand } from "./commands";
import { getArtRevision } from "./queries";
import { bootstrapArtBindings, commercialArtHash } from "./documents";
import {
  receivedArtDescription,
  receivedArtItem,
} from "@/domain/art/configuration";

export function moveArtLine(actor: Actor, requestId: string, raw: unknown) {
  const v = z
    .object({
      operationKey: artOperationSchema,
      sourceLineId: z.string().min(1).max(100),
      expectedPackageId: z.string().min(1),
      targetPackageId: z.string().min(1).nullable(),
    })
    .strict()
    .parse(raw);
  return runArtCommand(
    actor,
    "MOVE_LINE",
    v.operationKey,
    { requestId, ...v },
    async (tx) => {
      await lockCatalogRequest(tx, requestId);
      const requirement = await tx.artLineRequirement.findUnique({
        where: {
          requestId_sourceLineId: { requestId, sourceLineId: v.sourceLineId },
        },
      });
      if (
        !requirement ||
        requirement.packageId !== v.expectedPackageId ||
        v.targetPackageId === v.expectedPackageId
      )
        throw conflict();
      if (
        v.targetPackageId &&
        !(await tx.artPackage.findFirst({
          where: { id: v.targetPackageId, requestId },
        }))
      )
        throw new AppError("VALIDATION", "Pacote de destino inválido.");
      for (const id of [
        v.expectedPackageId,
        ...(v.targetPackageId ? [v.targetPackageId] : []),
      ].sort()) {
        const pkg = await tx.artPackage.findUniqueOrThrow({ where: { id } });
        if (pkg.currentRevisionId) {
          await tx.artRevision.update({
            where: { id: pkg.currentRevisionId },
            data: { state: "SUPERSEDED", version: { increment: 1 } },
          });
          await tx.artAccessGrant.updateMany({
            where: { revisionId: pkg.currentRevisionId },
            data: { revokedAt: new Date() },
          });
          await tx.artEvent.create({
            data: {
              revisionId: pkg.currentRevisionId,
              action: "MOVE_LINE",
              actorId: actor.id,
              actorName: actor.name,
              note: v.sourceLineId,
            },
          });
          await tx.artPackage.update({
            where: { id },
            data: { currentRevisionId: null },
          });
        }
      }
      await tx.artLineRequirement.update({
        where: { id: requirement.id },
        data: { packageId: v.targetPackageId, required: true },
      });
      return { moved: true };
    },
  );
}

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
      if ((await tx.artPackage.count({ where: { requestId } })) >= 20)
        throw new AppError(
          "VALIDATION",
          "Limite de vinte pacotes por solicitação atingido. Preserve o histórico e revise o atendimento.",
        );
      await bootstrapArtBindings(tx, requestId);
      const rows = await tx.catalogRequestLine.findMany({
        where: { requestId },
      });
      const bindings = await tx.artDocumentBinding.findMany({
        where: { requestId, valid: true },
        orderBy: { id: "desc" },
      });
      const lines = await Promise.all(
        v.sourceLineIds.map(async (sourceLineId) => {
          const line = rows
            .map((r) => r.snapshot as unknown as CatalogLineSnapshot)
            .find((l) => l.lineId === sourceLineId);
          const binding = bindings.find((b) => b.sourceLineId === sourceLineId);
          if (!line && !binding)
            throw new AppError(
              "VALIDATION",
              "Linha não pertence à solicitação.",
            );
          let item: DocumentItemInput | undefined;
          if (binding?.saleId)
            item = (
              (await tx.sale.findUnique({ where: { id: binding.saleId } }))
                ?.document as unknown as DocumentInput
            )?.items?.find((i) => i.lineId === binding.lineKey);
          else if (binding?.quoteId)
            item = (
              (await tx.quote.findUnique({ where: { id: binding.quoteId } }))
                ?.input as unknown as QuoteDraftInput
            )?.items?.find((i) => i.lineId === binding.lineKey);
          return {
            sourceLineId,
            description:
              item?.description ??
              (line
                ? receivedArtDescription(line)
                : "Linha comercial duplicada"),
            quantity: item?.quantity ?? line?.quantity ?? 1,
            configurationHash:
              binding?.configurationHash ??
              commercialArtHash(receivedArtItem(requestId, line!)),
          };
        }),
      );
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
          create: {
            requestId,
            sourceLineId: line.sourceLineId,
            configurationHash: line.configurationHash,
            details: { description: line.description, quantity: line.quantity },
            packageId: pkg.id,
          },
          update: {
            required: true,
            packageId: pkg.id,
            configurationHash: line.configurationHash,
            details: { description: line.description, quantity: line.quantity },
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
        ...((r.details ?? {}) as { description?: string; quantity?: number }),
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
        const decided = await tx.artDecision.findUnique({
          where: { revisionId: pkg.currentRevisionId },
        });
        if (!decided)
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
