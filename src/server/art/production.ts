import type { Prisma } from "@prisma/client";
import type { DocumentInput } from "@/domain/commerce/types";
import { AppError } from "@/lib/errors";
import { readDocumentArt } from "./documents";

// Caller holds planning lock (runProductionCommand) before Sale/ProductionOrder.
// Publishing and commercial edits also hold planning, so this read and the
// subsequent physical event are one serial operation with an art suspension.
export async function assertProductionArt(
  tx: Prisma.TransactionClient,
  saleId: string,
  lineKeys: string[],
): Promise<void> {
  const sale = await tx.sale.findUniqueOrThrow({ where: { id: saleId } });
  const items = (sale.document as unknown as DocumentInput)?.items;
  if (!Array.isArray(items)) {
    if (await tx.artDocumentBinding.count({ where: { saleId } }))
      throw new AppError(
        "CONFLICT",
        "Atualize os vínculos de arte antes de produzir.",
      );
    return;
  }
  const art = await readDocumentArt(tx, { saleId }, items);
  if (
    art.some((a) => lineKeys.includes(a.lineKey) && a.required && !a.applicable)
  )
    throw new AppError(
      "CONFLICT",
      "Arte pendente ou desatualizada. Obtenha aprovação da revisão aplicável antes de produzir.",
    );
}
