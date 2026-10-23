import { Prisma } from "@prisma/client";
import type { DocumentItemInput } from "@/domain/commerce/types";
import type { ArtManifestLine, DocumentArtDTO } from "@/domain/art/types";
export type { DocumentArtDTO } from "@/domain/art/types";
import { artHash } from "./commands";
import { readLineItems } from "@/server/pricing/document-costs";
type Owner = { quoteId: string } | { saleId: string };
export async function bootstrapArtBindings(
  tx: Prisma.TransactionClient,
  requestId: string,
) {
  const request = await tx.catalogRequest.findUnique({
    where: { id: requestId },
    select: { quoteId: true },
  });
  if (!request?.quoteId) return;
  const sale = await tx.sale.findUnique({
    where: { quoteId: request.quoteId },
  });
  if (sale) {
    const items = (sale.document as unknown as { items?: DocumentItemInput[] })
      ?.items;
    if (Array.isArray(items))
      await syncDocumentArt(
        tx,
        { saleId: sale.id },
        await readLineItems(tx, { saleId: sale.id }, items),
        true,
      );
  } else {
    const quote = await tx.quote.findUnique({ where: { id: request.quoteId } });
    const items = (quote?.input as unknown as { items?: DocumentItemInput[] })
      ?.items;
    if (Array.isArray(items))
      await syncDocumentArt(
        tx,
        { quoteId: request.quoteId },
        await readLineItems(tx, { quoteId: request.quoteId }, items),
        true,
      );
  }
}
export function commercialArtHash(item: DocumentItemInput) {
  return artHash({
    productId: item.productId ?? null,
    description: item.description,
    quantity: item.quantity,
    origin: item.catalogOrigin,
  });
}
export async function syncDocumentArt(
  tx: Prisma.TransactionClient,
  owner: Owner,
  items: DocumentItemInput[],
  onlyMissing = false,
) {
  const old = await tx.artDocumentBinding.findMany({ where: owner });
  const received = new Set(
    (
      await tx.catalogRequest.findMany({
        where: {
          id: {
            in: [
              ...new Set(
                items.flatMap((i) =>
                  i.catalogOrigin ? [i.catalogOrigin.requestId] : [],
                ),
              ),
            ],
          },
        },
        select: { id: true },
      })
    ).map((r) => r.id),
  );
  const sources = new Set<string>();
  for (const item of items) {
    const origin = item.catalogOrigin;
    if (!origin || !item.lineId || !received.has(origin.requestId)) continue;
    const source = `${origin.requestId}:${origin.sourceLineId}`;
    const existing = old.find((b) => b.lineKey === item.lineId);
    const duplicate =
      sources.has(source) ||
      old.some(
        (b) =>
          b.requestId === origin.requestId &&
          b.sourceLineId === origin.sourceLineId &&
          b.lineKey !== item.lineId,
      );
    sources.add(source);
    if (existing && onlyMissing) continue;
    const hash = commercialArtHash(item);
    const binding = existing
      ? await tx.artDocumentBinding.update({
          where: { id: existing.id },
          data: { configurationHash: hash },
        })
      : await tx.artDocumentBinding.create({
          data: {
            ...owner,
            lineKey: item.lineId,
            requestId: origin.requestId,
            sourceLineId: duplicate
              ? `copy:${artHash({ owner, lineKey: item.lineId }).slice(0, 40)}`
              : origin.sourceLineId,
            configurationHash: hash,
            valid: true,
          },
        });
    if (!binding.valid) continue;
    if (binding.sourceLineId !== origin.sourceLineId) {
      const inherited = await tx.artLineRequirement.findUnique({
        where: {
          requestId_sourceLineId: {
            requestId: origin.requestId,
            sourceLineId: origin.sourceLineId,
          },
        },
      });
      await tx.artLineRequirement.upsert({
        where: {
          requestId_sourceLineId: {
            requestId: origin.requestId,
            sourceLineId: binding.sourceLineId,
          },
        },
        create: {
          requestId: origin.requestId,
          sourceLineId: binding.sourceLineId,
          required: inherited?.required ?? false,
          configurationHash: hash,
          details: { description: item.description, quantity: item.quantity },
        },
        update: {},
      });
    }
    await tx.artLineRequirement.updateMany({
      where: {
        requestId: origin.requestId,
        sourceLineId: binding.sourceLineId,
      },
      data: {
        configurationHash: hash,
        details: { description: item.description, quantity: item.quantity },
      },
    });
  }
  // Removed identities remain historical. Re-adding the same source with a new identity
  // never borrows its old approval; it needs an explicit team reconciliation.
}
export async function readDocumentArt(
  tx: Prisma.TransactionClient,
  owner: Owner,
  items: DocumentItemInput[] = [],
): Promise<DocumentArtDTO[]> {
  const bindings = await tx.artDocumentBinding.findMany({ where: owner });
  const result: DocumentArtDTO[] = [];
  for (const item of items) {
    const origin = item.catalogOrigin;
    if (!origin) continue;
    const binding = bindings.find((b) => b.lineKey === item.lineId);
    const sourceLineId = binding?.sourceLineId ?? origin.sourceLineId;
    const requirement = await tx.artLineRequirement.findUnique({
      where: {
        requestId_sourceLineId: {
          requestId: origin.requestId,
          sourceLineId,
        },
      },
      include: {
        package: {
          include: { currentRevision: { include: { decision: true } } },
        },
      },
    });
    if (!requirement?.required) continue;
    const revision = requirement.package?.currentRevision;
    const line = (
      revision?.lines as unknown as ArtManifestLine[] | undefined
    )?.find((l) => l.sourceLineId === sourceLineId);
    const applicable = !!(
      binding?.valid &&
      revision?.state === "APPROVED" &&
      revision.decision?.action === "APPROVE" &&
      line?.configurationHash === commercialArtHash(item) &&
      binding.configurationHash === commercialArtHash(item)
    );
    result.push({
      lineKey: item.lineId ?? "",
      requestId: origin.requestId,
      sourceLineId,
      required: true,
      applicable,
      packageId: requirement.packageId,
      revisionId: revision?.id ?? null,
      revisionNumber: revision?.number ?? null,
      manifestHash: revision?.manifestHash ?? null,
      decisionId: applicable ? revision!.decision!.id : null,
      decidedAt: applicable
        ? revision!.decision!.decidedAt.toISOString()
        : null,
    });
  }
  return result;
}
export async function copyArtBindings(
  tx: Prisma.TransactionClient,
  quoteId: string,
  saleId: string,
) {
  const bindings = await tx.artDocumentBinding.findMany({ where: { quoteId } });
  for (const { id: _id, quoteId: _quoteId, ...binding } of bindings) {
    void _id;
    void _quoteId;
    await tx.artDocumentBinding.create({ data: { ...binding, saleId } });
  }
}
