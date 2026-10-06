import { randomUUID } from "node:crypto";
import type { Prisma, DocumentCostRevision } from "@prisma/client";
import type { Actor } from "../auth/session";
import type { DocumentItemInput } from "@/domain/commerce/types";
import type { DocumentCostsDTO, LineCostBinding } from "@/domain/pricing/types";
import { lineFingerprint } from "@/domain/pricing/document-costs";
import { AppError } from "@/lib/errors";
import { getPricingSnapshot } from "./estimates";
type Owner = { quoteId: string } | { saleId: string };
type Binding = { lineId: string; snapshotId: string };
function assertOwner(row: DocumentCostRevision, owner: Owner) {
  if (
    "quoteId" in owner
      ? row.quoteId !== owner.quoteId || row.saleId !== null
      : row.saleId !== owner.saleId || row.quoteId !== null
  )
    throw new AppError("CONFLICT", "A memória pertence a outro documento.");
}
async function revision(
  tx: Prisma.TransactionClient,
  id: string,
  owner: Owner,
) {
  const row = await tx.documentCostRevision.findUnique({ where: { id } });
  if (!row) throw new AppError("NOT_FOUND", "Memória de custo não encontrada.");
  assertOwner(row, owner);
  return row;
}
export async function readDocumentCosts(
  tx: Prisma.TransactionClient,
  owner: Owner,
  id: string | null,
): Promise<DocumentCostsDTO | null> {
  if (!id) return null;
  const r = await revision(tx, id, owner);
  const bindings = r.bindings as unknown as LineCostBinding[];
  const ids = [...new Set(bindings.map((b) => b.snapshotId))];
  return {
    revisionId: id,
    bindings,
    snapshots: await Promise.all(ids.map((id) => getPricingSnapshot(tx, id))),
  };
}
export async function readLineItems(
  tx: Prisma.TransactionClient,
  owner: Owner,
  items: DocumentItemInput[],
): Promise<DocumentItemInput[]> {
  const rows =
    "quoteId" in owner
      ? await tx.quoteItem.findMany({
          where: owner,
          orderBy: { position: "asc" },
        })
      : await tx.saleItem.findMany({
          where: owner,
          orderBy: { position: "asc" },
        });
  return items.map((item, position) => {
    const row = rows.find((r) => r.position === position);
    return {
      ...item,
      lineId:
        item.lineId ?? row?.lineKey ?? (row ? `legacy:${row.id}` : undefined),
    };
  });
}
export function prepareLineItems(
  items: DocumentItemInput[],
  hasCosts: boolean,
) {
  if (hasCosts && items.some((i) => !i.lineId))
    throw new AppError(
      "CONFLICT",
      "Atualize o documento para preservar a identidade dos itens e suas estimativas.",
    );
  const result = items.map((i) => ({ ...i, lineId: i.lineId ?? randomUUID() }));
  if (new Set(result.map((i) => i.lineId)).size !== result.length)
    throw new AppError(
      "VALIDATION",
      "Cada item deve ter uma identidade diferente.",
    );
  return result;
}
export function itemColumns(item: DocumentItemInput, position: number) {
  return {
    productId: item.productId ?? null,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineKey: item.lineId ?? null,
    position,
  };
}
export async function saveDocumentCosts(
  tx: Prisma.TransactionClient,
  _actor: Actor,
  owner: Owner,
  items: DocumentItemInput[],
  bindings: Binding[] | undefined,
  previousRevisionId: string | null,
): Promise<string | null> {
  const previous = previousRevisionId
    ? await revision(tx, previousRevisionId, owner)
    : null;
  const old = (previous?.bindings ?? []) as unknown as LineCostBinding[];
  const requested =
    bindings ?? old.filter((b) => items.some((i) => i.lineId === b.lineId));
  if (!previous && requested.length === 0) return null;
  if (new Set(requested.map((b) => b.lineId)).size !== requested.length)
    throw new AppError(
      "VALIDATION",
      "Há estimativas duplicadas para o mesmo item.",
    );
  const next: LineCostBinding[] = [];
  for (const b of requested) {
    const item = items.find((i) => i.lineId === b.lineId);
    if (!item)
      throw new AppError(
        "VALIDATION",
        "A estimativa não corresponde a um item do documento.",
      );
    const snapshot = await getPricingSnapshot(tx, b.snapshotId);
    const prior = old.find(
      (o) => o.lineId === b.lineId && o.snapshotId === b.snapshotId,
    );
    const fingerprint = prior?.fingerprint ?? lineFingerprint(item);
    const state =
      prior?.state === "STALE" ||
      fingerprint !== lineFingerprint(item) ||
      item.quantity !== snapshot.input.quantity
        ? "STALE"
        : "VALID";
    next.push({ ...b, fingerprint, state });
  }
  const last = await tx.documentCostRevision.findFirst({
    where: owner,
    orderBy: { revision: "desc" },
  });
  const created = await tx.documentCostRevision.create({
    data: {
      ...owner,
      revision: (last?.revision ?? 0) + 1,
      bindings: next as unknown as Prisma.InputJsonValue,
    },
  });
  return created.id;
}
export async function freezeDocumentCosts(
  tx: Prisma.TransactionClient,
  id: string | null,
): Promise<void> {
  if (!id) return;
  const r = await tx.documentCostRevision.findUniqueOrThrow({ where: { id } });
  const owner: Owner = r.quoteId
    ? { quoteId: r.quoteId }
    : { saleId: r.saleId! };
  const document =
    "quoteId" in owner
      ? await tx.quote.findUniqueOrThrow({ where: { id: owner.quoteId } })
      : await tx.sale.findUniqueOrThrow({ where: { id: owner.saleId } });
  if (document.costRevisionId !== id)
    throw new AppError("CONFLICT", "Memória de outro estado do documento.");
  const raw = "input" in document ? document.input : document.document;
  const items = (raw as unknown as { items?: DocumentItemInput[] }).items ?? [];
  const costs = await readDocumentCosts(tx, owner, id);
  for (const b of costs!.bindings) {
    const item = items.find((i) => i.lineId === b.lineId),
      snapshot = costs!.snapshots.find((s) => s.id === b.snapshotId)!;
    if (
      !item ||
      b.state === "STALE" ||
      lineFingerprint(item) !== b.fingerprint ||
      item.quantity !== snapshot.input.quantity
    )
      throw new AppError(
        "CONFLICT",
        "Recalcule ou remova a estimativa desatualizada antes de emitir ou confirmar.",
      );
  }
  if (!r.frozenAt)
    await tx.documentCostRevision.update({
      where: { id },
      data: { frozenAt: new Date() },
    });
}
export async function copyQuoteCostsToSale(
  tx: Prisma.TransactionClient,
  quoteId: string,
  saleId: string,
): Promise<string | null> {
  const quote = await tx.quote.findUniqueOrThrow({ where: { id: quoteId } });
  if (!quote.costRevisionId) return null;
  const source = await revision(tx, quote.costRevisionId, { quoteId });
  if (!source.frozenAt)
    throw new AppError(
      "CONFLICT",
      "A memória do orçamento precisa estar congelada.",
    );
  const sale = await tx.sale.findUniqueOrThrow({ where: { id: saleId } });
  if (sale.quoteId !== quoteId)
    throw new AppError("CONFLICT", "A origem não corresponde ao documento.");
  if (sale.costRevisionId) {
    const existing = await revision(tx, sale.costRevisionId, { saleId });
    if (existing.sourceRevisionId === source.id) return existing.id;
    throw new AppError("CONFLICT", "O destino já tem outra memória.");
  }
  const row = await tx.documentCostRevision.create({
    data: {
      saleId,
      revision: 1,
      bindings: source.bindings as Prisma.InputJsonValue,
      sourceRevisionId: source.id,
      frozenAt: new Date(),
    },
  });
  return row.id;
}
