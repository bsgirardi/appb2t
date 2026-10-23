import { createHash } from "node:crypto";
import sharp from "sharp";
import { AppError } from "@/lib/errors";
import { conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { db } from "@/lib/db";
import { z } from "zod";
import { artHash, runArtCommand } from "./commands";
import { lockArtPackage } from "./revisions";
import { getArtRevision } from "./queries";
import { normalizeImage } from "@/server/product-images";
import { validatePassivePdf } from "./pdf";

export interface ValidatedArtFile {
  name: string;
  bytes: Uint8Array;
  mimeType: string;
  sha256: string;
  preview: Uint8Array | null;
  previewSha256: string | null;
}
const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const artFilename = (filename: string) =>
  filename
    .replace(/\\/g, "/")
    .split("/")
    .pop()!
    .replace(/[\x00-\x1f\x7f"<>:|?*]/g, "_")
    .slice(0, 160) || "arquivo";

export async function validateArtFile(
  bytes: Uint8Array,
  filename: string,
): Promise<ValidatedArtFile> {
  if (!bytes.byteLength || bytes.byteLength > 10 * 1024 * 1024)
    throw new AppError("VALIDATION", "Arquivo vazio ou acima de dez MiB.");
  const name = artFilename(filename);
  const copy = new Uint8Array(bytes);
  const base = {
    name,
    bytes: copy,
    sha256: digest(copy),
    preview: null,
    previewSha256: null,
  };
  if (Buffer.from(copy.subarray(0, 5)).toString("ascii") === "%PDF-") {
    await validatePassivePdf(copy);
    return { ...base, mimeType: "application/pdf" };
  }
  try {
    const meta = await sharp(copy, {
      limitInputPixels: 40_000_000,
      failOn: "warning",
    }).metadata();
    if (
      !meta.format ||
      !["jpeg", "png", "webp"].includes(meta.format) ||
      (meta.pages ?? 1) > 1
    )
      throw Error("format");
    const preview = (
      await normalizeImage(copy, {
        maxBytes: 10 * 1024 * 1024,
        maxPixels: 40_000_000,
        maxDimension: 1600,
      })
    ).bytes;
    return {
      ...base,
      mimeType: `image/${meta.format}`,
      preview,
      previewSha256: digest(preview),
    };
  } catch {
    throw new AppError(
      "VALIDATION",
      "Use JPEG, PNG, WebP estático ou PDF válido, dentro dos limites de tamanho.",
    );
  }
}

export async function uploadArtFile(
  actor: Actor,
  revisionId: string,
  expectedVersion: number,
  operationKey: string,
  file: { bytes: Uint8Array; name: string },
  purpose: "FINAL" | "REFERENCE",
) {
  z.enum(["FINAL", "REFERENCE"]).parse(purpose);
  const user = await db.user.findFirst({
    where: { id: actor.id, active: true, role: actor.role },
  });
  if (!user) throw new AppError("FORBIDDEN", "Acesso não autorizado.");
  const payload = {
    revisionId,
    expectedVersion,
    purpose,
    name: artFilename(file.name),
    sha256: digest(file.bytes),
  };
  if (
    await db.artCommand.findUnique({
      where: { key: `art:${actor.id}:${operationKey}` },
    })
  ) {
    return runArtCommand<Awaited<ReturnType<typeof getArtRevision>>>(
      actor,
      "UPLOAD",
      operationKey,
      payload,
      async () => {
        throw conflict();
      },
    );
  }
  // Validation outside the transaction bounds parser/decoder time, never the DB lock.
  const validated = await validateArtFile(file.bytes, file.name);
  return runArtCommand(actor, "UPLOAD", operationKey, payload, async (tx) => {
    const pre = await tx.artRevision.findUnique({
      where: { id: revisionId },
    });
    if (!pre) throw new AppError("NOT_FOUND", "Revisão não encontrada.");
    await lockArtPackage(tx, pre.packageId);
    const row = await tx.artRevision.findUniqueOrThrow({
      where: { id: revisionId },
    });
    if (row.state !== "DRAFT" || row.version !== expectedVersion)
      throw conflict();
    const total = await tx.artFile.aggregate({
      where: { revisionId },
      _count: true,
      _sum: { byteLength: true },
    });
    if (
      total._count >= 10 ||
      (total._sum.byteLength ?? 0) + validated.bytes.byteLength >
        50 * 1024 * 1024
    )
      throw new AppError(
        "VALIDATION",
        "Limite de dez arquivos ou cinquenta MiB por revisão atingido.",
      );
    await tx.artFile.create({
      data: {
        revisionId,
        ...validated,
        bytes: new Uint8Array(validated.bytes),
        preview: validated.preview ? new Uint8Array(validated.preview) : null,
        purpose,
        byteLength: validated.bytes.byteLength,
      },
    });
    await tx.artRevision.update({
      where: { id: revisionId },
      data: { version: { increment: 1 } },
    });
    await tx.artEvent.create({
      data: {
        revisionId,
        action: "UPLOAD",
        actorId: actor.id,
        actorName: actor.name,
        note: validated.name,
      },
    });
    return getArtRevision(tx, revisionId);
  });
}

export function deleteDraftFile(
  actor: Actor,
  fileId: string,
  expectedVersion: number,
  operationKey: string,
) {
  return runArtCommand(
    actor,
    "DELETE_FILE",
    operationKey,
    { fileId, expectedVersion },
    async (tx) => {
      const file = await tx.artFile.findUnique({
        where: { id: fileId },
        include: { revision: true },
      });
      if (!file) throw new AppError("NOT_FOUND", "Arquivo não encontrado.");
      await lockArtPackage(tx, file.revision.packageId);
      const row = await tx.artRevision.findUniqueOrThrow({
        where: { id: file.revisionId },
      });
      if (row.state !== "DRAFT" || row.version !== expectedVersion)
        throw conflict();
      await tx.artFile.delete({ where: { id: fileId } });
      await tx.artRevision.update({
        where: { id: row.id },
        data: { version: { increment: 1 } },
      });
      await tx.artEvent.create({
        data: {
          revisionId: row.id,
          action: "DELETE_DRAFT_FILE",
          actorId: actor.id,
          actorName: actor.name,
          note: artHash({ id: file.id, sha256: file.sha256 }),
        },
      });
      return getArtRevision(tx, row.id);
    },
  );
}
