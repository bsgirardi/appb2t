import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { reviewInquiryWithClient } from "@/server/inquiry";
import { readProductConfiguration } from "@/domain/products/configuration";
import { lockKitCatalog } from "@/server/kits/locks";
import { kitDiscountTiersSchema } from "@/domain/kits/validation";
import {
  kitRequestSnapshotSchema,
  CATALOG_SNAPSHOT_MAX_BYTES,
} from "@/domain/kits/snapshot";
import type { KitGroupSnapshot } from "@/domain/kits/types";
import type {
  CatalogLineSnapshot,
  CatalogSubmission,
} from "@/domain/catalog-requests/types";
export async function buildRequestSnapshot(
  tx: Prisma.TransactionClient,
  submission: CatalogSubmission,
): Promise<{
  lines: CatalogLineSnapshot[];
  knownTotal: string | null;
  consultCount: number;
  groups: KitGroupSnapshot[];
}> {
  const ids = [...new Set(submission.items.map((i) => i.productId))].sort();
  await lockKitCatalog(
    tx,
    ids,
    (submission.groups ?? []).map((g) => g.kitId),
  );
  const review = await reviewInquiryWithClient(
    tx,
    submission.schemaVersion === 2
      ? {
          schemaVersion: 2,
          items: submission.items,
          groups: submission.groups ?? [],
        }
      : { items: submission.items },
  );
  if (!review.ready)
    throw new AppError(
      "CONFLICT",
      "A seleção mudou. Confira os itens e confirme as referências antes de enviar.",
      Object.fromEntries(
        review.lines.flatMap((line, i) =>
          line.problem || line.requiresConfirmation
            ? [[`items.${i}`, line.problem ?? "Confirme a referência atual."]]
            : [],
        ),
      ),
    );
  const products = await tx.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      configuration: true,
      leadTimeDays: true,
      paymentTerms: true,
      compositionImageId: true,
      images: { select: { id: true }, orderBy: { position: "asc" } },
    },
  });
  const occupied = new Set(
    review.lines.flatMap((line) => (line.lineId ? [line.lineId] : [])),
  );
  const lines = review.lines.map((line, index): CatalogLineSnapshot => {
    let lineId = line.lineId;
    if (!lineId) {
      let suffix = index;
      while (occupied.has(`line-${suffix}`)) suffix++;
      lineId = `line-${suffix}`;
      occupied.add(lineId);
    }
    const product = products.find((p) => p.id === line.productId)!;
    const definition = readProductConfiguration(product.configuration);
    return {
      schemaVersion: 1,
      lineId,
      ...(line.kitInstanceId ? { kitInstanceId: line.kitInstanceId } : {}),
      productId: line.productId,
      commercialRevision: line.currentRevision!,
      name: line.name,
      sku: line.sku,
      color: line.color,
      size: line.size,
      answers: line.answers,
      answerLabels: line.answerLabels,
      quantity: line.quantity,
      priceKind: line.configuredPrice!.kind,
      unitPrice: line.price,
      subtotal: line.subtotal,
      included: definition.included,
      leadTimeCondition: definition.leadTimeCondition,
      productionLeadDays: product.leadTimeDays,
      paymentTerms: product.paymentTerms,
    };
  });
  const kits = await tx.catalogKit.findMany({
    where: { id: { in: (submission.groups ?? []).map((g) => g.kitId) } },
  });
  const groups: KitGroupSnapshot[] = (review.groups ?? []).map((group) => {
    const kit = kits.find((k) => k.id === group.kitId)!;
    const members = lines.filter((l) => l.kitInstanceId === group.instanceId);
    return {
      schemaVersion: 1,
      instanceId: group.instanceId,
      kitId: kit.id,
      name: kit.name,
      commercialRevision: kit.commercialRevision,
      tiers: kitDiscountTiersSchema.parse(kit.tiers),
      lineIds: members.map((l) => l.lineId),
      placements: group.placements,
      price: group.price!,
      images: members.map((l) => {
        const product = products.find((p) => p.id === l.productId)!;
        const imageId =
          product.images.find((i) => i.id === product.compositionImageId)?.id ??
          product.images[0]?.id ??
          null;
        return {
          lineId: l.lineId,
          imageId,
          imageUrl: imageId
            ? `/api/products/${product.id}/images/${imageId}`
            : null,
        };
      }),
    };
  });
  const validated = kitRequestSnapshotSchema.parse({
    schemaVersion: 1,
    groups,
  });
  if (
    Buffer.byteLength(
      JSON.stringify({ lines, kitSnapshot: validated }),
      "utf8",
    ) > CATALOG_SNAPSHOT_MAX_BYTES
  )
    throw new AppError(
      "CONFLICT",
      "A seleção ficou muito grande. Reduza os componentes antes de enviar.",
    );
  return {
    lines,
    groups: validated.groups,
    knownTotal: review.knownTotal ?? null,
    consultCount: review.consultCount ?? 0,
  };
}
