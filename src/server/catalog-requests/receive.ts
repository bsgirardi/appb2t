import { createHash } from "node:crypto";
import type { CatalogRequest } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { CatalogReceipt } from "@/domain/catalog-requests/types";
import {
  parseCatalogSubmission,
  attemptKeySchema,
} from "@/domain/catalog-requests/validation";
import { canonicalSubmission } from "@/domain/catalog-requests/identity";
import { consumeRequestQuota } from "./rate-limit";
import { buildRequestSnapshot } from "./snapshot";
export const requestHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function receiptOf(
  row: Pick<CatalogRequest, "sequence" | "createdAt">,
): CatalogReceipt {
  return {
    protocol: `SOL-${String(row.sequence).padStart(6, "0")}`,
    acceptedAt: row.createdAt.toISOString(),
    received: true,
  };
}
export async function findCatalogReceipt(
  attemptKey: string,
): Promise<CatalogReceipt | null> {
  const row = await db.catalogRequest.findUnique({
    where: { attemptHash: requestHash(attemptKeySchema.parse(attemptKey)) },
  });
  return row ? receiptOf(row) : null;
}
export async function receiveCatalogRequest(
  raw: unknown,
  browserId: string,
): Promise<CatalogReceipt> {
  const submission = parseCatalogSubmission(raw);
  const attemptHash = requestHash(submission.attemptKey);
  const contentHash = requestHash(canonicalSubmission(submission));
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${attemptHash}, 0))`;
      const existing = await tx.catalogRequest.findUnique({
        where: { attemptHash },
      });
      if (existing) {
        if (existing.contentHash !== contentHash)
          throw new AppError(
            "CONFLICT",
            "Esta tentativa já foi recebida com outro conteúdo. Verifique o recibo anterior.",
          );
        return receiptOf(existing);
      }
      // Separate committed debit survives a later commercial validation rejection.
      await consumeRequestQuota(browserId);
      const snapshot = await buildRequestSnapshot(tx, submission);
      const row = await tx.catalogRequest.create({
        data: {
          attemptHash,
          contentHash,
          name: submission.contact.name,
          preferredChannel: submission.contact.preferredChannel,
          contact: submission.contact as unknown as Prisma.InputJsonValue,
          knownTotal: snapshot.knownTotal,
          consultCount: snapshot.consultCount,
          lines: {
            create: snapshot.lines.map((line, position) => ({
              position,
              snapshot: line as unknown as Prisma.InputJsonValue,
              quantity: line.quantity,
              priceKind: line.priceKind,
              unitPrice: line.unitPrice,
              subtotal: line.subtotal,
            })),
          },
          events: { create: { action: "RECEIVED", actorName: "Visitante" } },
        },
      });
      return receiptOf(row);
    },
    { timeout: 20000 },
  );
}
