import type { CatalogSubmission } from "@/domain/catalog-requests/types";
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
import { consumeRequestQuotaWithClient } from "./rate-limit";
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
  const outcome = await db.$transaction(
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
        return { receipt: receiptOf(existing) };
      }
      await consumeRequestQuotaWithClient(tx, browserId);
      let snapshot;
      try {
        snapshot = await buildRequestSnapshot(tx, submission);
      } catch (error) {
        // Commit the debit for a rejected offer without creating a request.
        // Throw outside this transaction so intake never needs a second connection.
        if (error instanceof AppError && error.code === "CONFLICT")
          return { rejection: error };
        throw error;
      }
      const row = await storeRequestSnapshot(tx, submission, attemptHash, contentHash, snapshot);
      return { receipt: receiptOf(row) };
    },
    { timeout: 20000 },
  );
  if (outcome.rejection) throw outcome.rejection;
  return outcome.receipt!;
}

export async function storeRequestSnapshot(tx: Prisma.TransactionClient, submission: CatalogSubmission, attemptHash:string, contentHash:string, snapshot:Awaited<ReturnType<typeof buildRequestSnapshot>>) {
      const row = await tx.catalogRequest.create({
        data: {
          attemptHash,
          contentHash,
          name: submission.contact.name,
          preferredChannel: submission.contact.preferredChannel,
          contact: submission.contact as unknown as Prisma.InputJsonValue,
          knownTotal: snapshot.knownTotal,
          consultCount: snapshot.consultCount,
          ...(snapshot.groups.length
            ? {
                kitSnapshot: {
                  schemaVersion: 1,
                  groups: snapshot.groups,
                } as unknown as Prisma.InputJsonValue,
              }
            : {}),
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

return row;
}
