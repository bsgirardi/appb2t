import { createHash, createHmac, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import { appUrl } from "@/lib/env";
import type { Actor } from "@/server/auth/session";
import { runArtCommand } from "./commands";
import { lockArtPackage } from "./revisions";
import { getArtRevision } from "./queries";
import type { CatalogLineSnapshot } from "@/domain/catalog-requests/types";

export const accessHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const denied = () =>
  new AppError(
    "FORBIDDEN",
    "Link indisponível ou expirado. Peça um novo link à equipe.",
  );
function secret() {
  const key = process.env.ART_ACCESS_KEY;
  if (!key || !/^[a-f0-9]{64}$/i.test(key))
    throw new AppError(
      "VALIDATION",
      "Configure ART_ACCESS_KEY com 32 bytes aleatórios antes de compartilhar arte.",
    );
  return Buffer.from(key, "hex");
}
function grantToken(id: string, key: Buffer) {
  return createHmac("sha256", key).update(`art-access-v1:${id}`).digest("hex");
}

export async function consumeArtQuota(
  bucket: string,
  limit: number,
  seconds: number,
) {
  const window = Math.floor(Date.now() / (seconds * 1000));
  const key = `art:${bucket}:${window}`;
  const row = await db.catalogRequestQuota.upsert({
    where: { key },
    create: {
      key,
      attempts: 1,
      expiresAt: new Date((window + 1) * seconds * 1000),
    },
    update: { attempts: { increment: 1 } },
  });
  if (row.attempts > limit)
    throw new AppError(
      "RATE_LIMIT",
      "Muitas tentativas. Aguarde antes de tentar novamente.",
    );
}

export async function issueArtAccess(
  actor: Actor,
  revisionId: string,
  expectedVersion: number,
  operationKey: string,
) {
  const key = secret();
  const stored = await runArtCommand(
    actor,
    "ISSUE_ACCESS",
    operationKey,
    { revisionId, expectedVersion },
    async (tx) => {
      const pre = await tx.artRevision.findUnique({
        where: { id: revisionId },
      });
      if (!pre) throw denied();
      const pkg = await lockArtPackage(tx, pre.packageId);
      const row = await tx.artRevision.findUniqueOrThrow({
        where: { id: revisionId },
      });
      if (
        row.version !== expectedVersion ||
        pkg.currentRevisionId !== revisionId ||
        row.state !== "AWAITING_CUSTOMER"
      )
        throw conflict();
      await tx.artAccessGrant.updateMany({
        where: { revisionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      const id = randomBytes(32).toString("hex");
      const grant = await tx.artAccessGrant.create({
        data: {
          id,
          revisionId,
          tokenHash: accessHash(grantToken(id, key)),
          expiresAt: new Date(Date.now() + 7 * 86400000),
        },
      });
      await tx.artEvent.create({
        data: {
          revisionId,
          action: "ISSUE_ACCESS",
          actorId: actor.id,
          actorName: actor.name,
        },
      });
      return { grantId: grant.id, expiresAt: grant.expiresAt.toISOString() };
    },
  );
  const token = grantToken(stored.grantId, key);
  const grant = await db.artAccessGrant.findUnique({
    where: { id: stored.grantId },
  });
  if (
    !grant ||
    grant.revokedAt ||
    grant.expiresAt <= new Date() ||
    grant.tokenHash !== accessHash(token)
  )
    throw new AppError(
      "CONFLICT",
      "Link anterior indisponível. Renove com uma nova operação.",
    );
  return {
    url: `${appUrl().origin}/portfolio/arte#${token}`,
    expiresAt: stored.expiresAt,
  };
}

export function revokeArtAccess(
  actor: Actor,
  revisionId: string,
  operationKey: string,
) {
  return runArtCommand(
    actor,
    "REVOKE_ACCESS",
    operationKey,
    { revisionId },
    async (tx) => {
      const row = await tx.artRevision.findUnique({
        where: { id: revisionId },
      });
      if (!row) throw denied();
      await lockArtPackage(tx, row.packageId);
      await tx.artAccessGrant.updateMany({
        where: { revisionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.artEvent.create({
        data: {
          revisionId,
          action: "REVOKE_ACCESS",
          actorId: actor.id,
          actorName: actor.name,
        },
      });
      return { revoked: true };
    },
  );
}

export async function exchangeArtToken(token: string) {
  await consumeArtQuota("exchange-global", 3000, 3600);
  if (!/^[a-f0-9]{64}$/.test(token)) throw denied();
  const hash = accessHash(token);
  await consumeArtQuota(`exchange:${hash}`, 20, 60);
  return db.$transaction(async (tx) => {
    const grant = await tx.artAccessGrant.findUnique({
      where: { tokenHash: hash },
      include: { revision: { include: { package: true } } },
    });
    if (
      !grant ||
      grant.revokedAt ||
      grant.expiresAt <= new Date() ||
      grant.revision.package.currentRevisionId !== grant.revisionId
    )
      throw denied();
    await tx.$queryRaw`SELECT id FROM "ArtAccessGrant" WHERE id=${grant.id} FOR UPDATE`;
    // Re-read after lock so concurrent revocation/renewal cannot issue a usable session.
    const current = await tx.artAccessGrant.findUniqueOrThrow({
      where: { id: grant.id },
    });
    if (current.revokedAt || current.expiresAt <= new Date()) throw denied();
    await tx.artAccessSession.deleteMany({
      where: { grantId: grant.id, expiresAt: { lte: new Date() } },
    });
    if (
      (await tx.artAccessSession.count({ where: { grantId: grant.id } })) >= 20
    )
      throw new AppError(
        "RATE_LIMIT",
        "Limite de acessos atingido. Peça novo link à equipe.",
      );
    const sessionToken = randomBytes(32).toString("hex");
    await tx.artAccessSession.create({
      data: {
        tokenHash: accessHash(sessionToken),
        grantId: grant.id,
        expiresAt: grant.expiresAt,
      },
    });
    return {
      sessionToken,
      revisionId: grant.revisionId,
      expiresAt: grant.expiresAt,
    };
  });
}

export async function authorizeArtSession(
  tx: Prisma.TransactionClient,
  sessionToken: string,
  revisionId: string,
) {
  if (!/^[a-f0-9]{64}$/.test(sessionToken)) throw denied();
  const session = await tx.artAccessSession.findUnique({
    where: { tokenHash: accessHash(sessionToken) },
    include: {
      grant: { include: { revision: { include: { package: true } } } },
    },
  });
  const now = new Date();
  if (
    !session ||
    session.expiresAt <= now ||
    session.grant.revokedAt ||
    session.grant.expiresAt <= now ||
    session.grant.revisionId !== revisionId
  )
    throw denied();
  return session.grant;
}

export function readArtReview(sessionToken: string, revisionId: string) {
  return db.$transaction(
    async (tx) => {
      const grant = await authorizeArtSession(tx, sessionToken, revisionId);
      const revision = await getArtRevision(tx, revisionId);
      const historical =
        grant.revision.package.currentRevisionId !== revisionId;
      if (historical && !revision.decision) throw denied();
      const received = await tx.catalogRequestLine.findMany({
        where: { requestId: grant.revision.package.requestId },
      });
      const descriptions = revision.lines.map((line) => {
        const source = received
          .map((r) => r.snapshot as unknown as CatalogLineSnapshot)
          .find((l) => l.lineId === line.sourceLineId);
        return {
          sourceLineId: line.sourceLineId,
          name: line.description ?? source?.name ?? "Linha comercial",
          quantity: line.quantity ?? source?.quantity ?? 1,
          color: source?.color ?? "",
          size: source?.size ?? "",
          personalizations:
            source?.answerLabels.map((a) => ({
              label: a.label,
              value: a.valueLabel,
            })) ?? [],
        };
      });
      return {
        id: revision.id,
        number: revision.number,
        state: revision.state,
        instructions: historical ? "" : revision.instructions,
        manifestHash: revision.manifestHash,
        lines: historical ? [] : descriptions,
        files: historical ? [] : revision.files,
        decision: revision.decision,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}

export function readPublicArtFile(
  sessionToken: string,
  revisionId: string,
  fileId: string,
) {
  return db.$transaction(
    async (tx) => {
      const grant = await authorizeArtSession(tx, sessionToken, revisionId);
      if (grant.revision.package.currentRevisionId !== revisionId)
        throw denied();
      const file = await tx.artFile.findFirst({
        where: { id: fileId, revisionId },
      });
      if (!file) throw denied();
      return file;
    },
    { isolationLevel: "RepeatableRead" },
  );
}
