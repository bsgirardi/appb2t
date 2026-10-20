import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { reviewInquiryWithClient } from "@/server/inquiry";
import { readProductConfiguration } from "@/domain/products/configuration";
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
}> {
  const ids = [...new Set(submission.items.map((i) => i.productId))].sort();
  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM "Product" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR SHARE`,
  );
  const review = await reviewInquiryWithClient(tx, { items: submission.items });
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
  return {
    lines,
    knownTotal: review.knownTotal ?? null,
    consultCount: review.consultCount ?? 0,
  };
}
