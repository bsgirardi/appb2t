import { assertOpportunityQuoteCustomer } from "./opportunities/commerce";
import {
  readDocumentCosts,
  readLineItems,
  prepareLineItems,
  itemColumns,
  saveDocumentCosts,
  freezeDocumentCosts,
} from "./pricing/document-costs";
import { invalidateCheckoutQuote } from "./checkout/quote-invalidation";
import { Prisma } from "@prisma/client";
import { syncDocumentArt, readDocumentArt } from "./art/documents";
import { lockPlanning } from "./planning/coordination";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "./auth/session";
import {
  costBindingsSchema,
  quoteDraftSchema,
  quoteSchema,
  civilDateSchema,
} from "@/domain/commerce/validation";
import { calculateDocumentTotals } from "@/domain/commerce/totals";
import { effectiveQuoteStatus } from "@/domain/commerce/states";
import {
  todaySaoPaulo,
  civilDateToDb,
  civilDateFromDb,
} from "@/domain/commerce/dates";
import type {
  QuoteDTO,
  QuoteDraftInput,
  DocumentSnapshot,
  DocumentTotals,
} from "@/domain/commerce/types";
import { paginationSchema, type Page } from "@/domain/shared/pagination";
import { createDocumentSnapshot } from "./commerce/snapshots";
import { quoteEvent } from "./commerce/audit";
import { catalogLineOriginSchema } from "@/domain/catalog-requests/snapshot";
import {
  kitDiscountReviewSchema,
  assertKitDocumentBytes,
} from "@/domain/kits/document";
import { enforceKitDocumentEdit } from "./kits/document-history";
const saveQuoteSchema = quoteDraftSchema.extend({
  expectedVersion: z.number().int().positive().optional(),
  costBindings: costBindingsSchema.optional(),
  kitDiscountReview: kitDiscountReviewSchema.optional(),
});
type Row = Prisma.QuoteGetPayload<{
  include: { events: true; sale: { select: { id: true } } };
}>;
async function dto(
  row: Row,
  tx: Prisma.TransactionClient = db,
): Promise<QuoteDTO> {
  const input = row.input as QuoteDraftInput;
  return {
    id: row.id,
    number: `ORC-${String(row.sequence).padStart(6, "0")}`,
    status: effectiveQuoteStatus(
      row.status,
      row.validUntil ? civilDateFromDb(row.validUntil) : "9999-12-31",
      todaySaoPaulo(new Date()),
    ),
    version: row.version,
    input: {
      ...input,
      ...(input.items
        ? { items: await readLineItems(tx, { quoteId: row.id }, input.items) }
        : {}),
    },
    art: await readDocumentArt(tx, { quoteId: row.id }, input.items ?? []),
    costs: await readDocumentCosts(tx, { quoteId: row.id }, row.costRevisionId),
    totals: row.totals as unknown as DocumentTotals | null,
    snapshot: row.snapshot as unknown as DocumentSnapshot | null,
    events: row.events.map((e) => ({
      id: e.id,
      action: e.action,
      reason: e.reason,
      actorName: e.actorName,
      createdAt: e.createdAt.toISOString(),
    })),
    createdAt: row.createdAt.toISOString(),
    saleId: row.sale?.id ?? null,
  };
}
async function row(tx: Prisma.TransactionClient, id: string) {
  const q = await tx.quote.findUnique({
    where: { id },
    include: {
      sale: { select: { id: true } },
      events: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
  });
  if (!q) throw new AppError("NOT_FOUND", "Orçamento não encontrado.");
  return q;
}
async function lock(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "Quote" WHERE id=${id} FOR UPDATE`;
}
export async function getQuote(_actor: Actor, id: string) {
  return db.$transaction(async (tx) => dto(await row(tx, id), tx), {
    isolationLevel: "RepeatableRead",
  });
}
export async function saveQuote(
  actor: Actor,
  id: string | undefined,
  raw: unknown,
): Promise<QuoteDTO> {
  if (
    !id &&
    (saveQuoteSchema.parse(raw).items?.some((item) => item.catalogOrigin) ||
      saveQuoteSchema.parse(raw).catalogKits)
  )
    throw new AppError(
      "VALIDATION",
      "Prepare a origem pelo atendimento da solicitação.",
    );
  return db.$transaction((tx) => saveQuoteWithClient(tx, actor, id, raw));
}
export async function saveQuoteWithClient(
  tx: Prisma.TransactionClient,
  actor: Actor,
  id: string | undefined,
  raw: unknown,
): Promise<QuoteDTO> {
  const parsed = saveQuoteSchema.parse(raw);
  await lockPlanning(tx);
  const { expectedVersion, costBindings, kitDiscountReview, ...input } = parsed;
  let kitDiscountReviewed = false;
  let previousRevisionId: string | null = null;
  if (id) {
    await lock(tx, id);
    const old = await row(tx, id);
    await assertOpportunityQuoteCustomer(tx, id, input.customerId ?? null);
    previousRevisionId = old.costRevisionId;
    if (old.version !== expectedVersion) throw conflict();
    if (old.status !== "RASCUNHO")
      throw new AppError("CONFLICT", "Reabra o orçamento antes de editar.");
    kitDiscountReviewed = enforceKitDocumentEdit(
      old.input as QuoteDraftInput,
      input,
      kitDiscountReview,
    );
    const origins = new Map(
      (old.input as QuoteDraftInput).items?.map((item) => [
        item.lineId,
        item.catalogOrigin,
      ]) ?? [],
    );
    for (const item of input.items ?? []) {
      const original = origins.get(item.lineId);
      if (item.catalogOrigin) {
        const incoming = JSON.stringify(item.catalogOrigin);
        const same = original
          ? incoming === JSON.stringify(catalogLineOriginSchema.parse(original))
          : !origins.has(item.lineId) &&
            [...origins.values()].some(
              (value) =>
                value &&
                incoming ===
                  JSON.stringify(catalogLineOriginSchema.parse(value)),
            );
        if (!same)
          throw new AppError(
            "VALIDATION",
            "A origem recebida não pode ser substituída.",
          );
      }
      if (original) item.catalogOrigin = original;
    }
  }
  const previous = await readDocumentCosts(
    tx,
    { quoteId: id ?? "" },
    previousRevisionId,
  );
  if (input.items)
    input.items = prepareLineItems(input.items, !!previous?.bindings.length);
  else if (previous?.bindings.length && costBindings?.length !== 0)
    throw new AppError(
      "CONFLICT",
      "Atualize o documento para preservar os itens e suas estimativas.",
    );
  if (
    input.customerId &&
    !(await tx.customer.findFirst({
      where: { id: input.customerId, active: true },
    }))
  )
    throw new AppError("VALIDATION", "Selecione um cliente ativo.");
  const totals =
    input.items && input.discount !== undefined && input.shipping !== undefined
      ? calculateDocumentTotals(input.items, input.discount, input.shipping)
      : null;
  const data = {
    input: input as Prisma.InputJsonValue,
    customerId: input.customerId ?? null,
    validUntil: input.validUntil ? civilDateToDb(input.validUntil) : null,
    totals: totals ? { ...totals } : Prisma.DbNull,
  };
  if (input.catalogKits) {
    try {
      assertKitDocumentBytes(input);
    } catch (error) {
      throw new AppError("VALIDATION", (error as Error).message);
    }
  }
  const q = id
    ? await tx.quote.update({
        where: { id },
        data: { ...data, version: { increment: 1 } },
      })
    : await tx.quote.create({ data });
  await tx.quoteItem.deleteMany({ where: { quoteId: q.id } });
  await syncDocumentArt(tx, { quoteId: q.id }, input.items ?? []);
  if (input.items)
    await tx.quoteItem.createMany({
      data: input.items.map((i, position) => ({
        ...itemColumns(i, position),
        quoteId: q.id,
        position,
      })),
    });
  const costRevisionId = await saveDocumentCosts(
    tx,
    actor,
    { quoteId: q.id },
    input.items ?? [],
    costBindings,
    previousRevisionId,
  );
  await tx.quote.update({ where: { id: q.id }, data: { costRevisionId } });
  await quoteEvent(tx, actor, q.id, id ? "EDIT" : "CREATE");
  if (id) await invalidateCheckoutQuote(tx, id);
  if (input.catalogKits && (!id || kitDiscountReviewed))
    await quoteEvent(
      tx,
      actor,
      q.id,
      "KIT_DISCOUNT_REVIEW",
      `Desconto revisado para os valores da versão ${q.version}.`,
    );
  return dto(await row(tx, q.id), tx);
}
export async function transitionQuote(
  actor: Actor,
  id: string,
  expectedVersion: number,
  rawAction: "ISSUE" | "APPROVE" | "REJECT" | "REOPEN",
): Promise<QuoteDTO> {
  const action = z
    .enum(["ISSUE", "APPROVE", "REJECT", "REOPEN"])
    .parse(rawAction);
  z.number().int().positive().parse(expectedVersion);
  return db.$transaction(async (tx) => {
    await lockPlanning(tx);
    await lock(tx, id);
    const q = await row(tx, id);
    if (q.version !== expectedVersion) throw conflict();
    const status = (await dto(q, tx)).status;
    let data: Prisma.QuoteUpdateInput = { version: { increment: 1 } };
    if (action === "ISSUE") {
      if (status !== "RASCUNHO") throw conflict();
      const parsed = quoteSchema.safeParse(q.input);
      if (!parsed.success)
        throw new AppError(
          "VALIDATION",
          "Revise o cliente, os itens, a validade e as condições de pagamento; informe também desconto e frete, mesmo que sejam zero.",
        );
      const input = parsed.data;
      if (input.validUntil < todaySaoPaulo(new Date()))
        throw new AppError(
          "VALIDATION",
          "A validade não pode estar no passado.",
        );
      await freezeDocumentCosts(tx, q.costRevisionId);
      const { snapshot, logo } = await createDocumentSnapshot(
        tx,
        input,
        `/api/quotes/${id}/logo`,
        { quoteId: id },
      );
      await tx.documentLogo.deleteMany({ where: { quoteId: id } });
      if (logo)
        await tx.documentLogo.create({
          data: {
            quoteId: id,
            bytes: new Uint8Array(logo.bytes),
            mimeType: logo.mimeType,
          },
        });
      data = {
        ...data,
        status: "ENVIADO",
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        totals: {
          ...calculateDocumentTotals(
            input.items,
            input.discount,
            input.shipping,
          ),
        },
      };
    } else if (action === "REOPEN") {
      if (!["ENVIADO", "APROVADO", "REJEITADO", "EXPIRADO"].includes(status))
        throw conflict();
      data = { ...data, status: "RASCUNHO", snapshot: Prisma.DbNull };
    } else {
      if (status !== "ENVIADO")
        throw new AppError(
          "CONFLICT",
          "O orçamento não está disponível para esta ação.",
        );
      data.status = action === "APPROVE" ? "APROVADO" : "REJEITADO";
    }
    await tx.quote.update({ where: { id }, data });
    await invalidateCheckoutQuote(tx, id);
    await quoteEvent(tx, actor, id, action);
    return dto(await row(tx, id), tx);
  });
}
export const quoteFilterSchema = paginationSchema.extend({
  status: z
    .enum([
      "all",
      "RASCUNHO",
      "ENVIADO",
      "APROVADO",
      "REJEITADO",
      "EXPIRADO",
      "CONVERTIDO",
    ])
    .default("all"),
  from: civilDateSchema.optional(),
  to: civilDateSchema.optional(),
});
export async function listQuotes(
  _actor: Actor,
  raw: unknown = {},
): Promise<Page<QuoteDTO>> {
  const f = quoteFilterSchema.parse(raw),
    today = civilDateToDb(todaySaoPaulo(new Date()));
  const where: Prisma.QuoteWhereInput = {};
  if (f.status === "EXPIRADO") {
    where.status = { in: ["ENVIADO", "APROVADO"] };
    where.validUntil = { lt: today };
  } else if (f.status !== "all") {
    where.status = f.status;
    if (["ENVIADO", "APROVADO"].includes(f.status))
      where.validUntil = { gte: today };
  }
  if (f.search) {
    const seq = Number(f.search.replace(/^ORC-/i, ""));
    where.OR = [
      { customer: { name: { contains: f.search, mode: "insensitive" } } },
      ...(Number.isSafeInteger(seq) && seq > 0 ? [{ sequence: seq }] : []),
    ];
  }
  if (f.from || f.to)
    where.createdAt = {
      ...(f.from ? { gte: new Date(`${f.from}T00:00:00-03:00`) } : {}),
      ...(f.to
        ? {
            lt: new Date(
              new Date(`${f.to}T00:00:00-03:00`).getTime() + 86400000,
            ),
          }
        : {}),
    };
  const [rows, total] = await db.$transaction(
    [
      db.quote.findMany({
        where,
        include: { events: true, sale: { select: { id: true } } },
        orderBy: { sequence: "desc" },
        skip: (f.page - 1) * f.pageSize,
        take: f.pageSize,
      }),
      db.quote.count({ where }),
    ],
    { isolationLevel: "RepeatableRead" },
  );
  return {
    items: await Promise.all(rows.map((row) => dto(row))),
    total,
    page: f.page,
    pageSize: f.pageSize,
  };
}
