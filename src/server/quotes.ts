import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "./auth/session";
import {
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
type Row = Prisma.QuoteGetPayload<{
  include: { events: true; sale: { select: { id: true } } };
}>;
function dto(row: Row): QuoteDTO {
  return {
    id: row.id,
    number: `ORC-${String(row.sequence).padStart(6, "0")}`,
    status: effectiveQuoteStatus(
      row.status,
      row.validUntil ? civilDateFromDb(row.validUntil) : "9999-12-31",
      todaySaoPaulo(new Date()),
    ),
    version: row.version,
    input: row.input as QuoteDraftInput,
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
  return dto(await row(db, id));
}
export async function saveQuote(
  actor: Actor,
  id: string | undefined,
  raw: unknown,
): Promise<QuoteDTO> {
  const parsed = quoteDraftSchema
    .extend({ expectedVersion: z.number().int().positive().optional() })
    .parse(raw);
  const { expectedVersion, ...input } = parsed;
  return db.$transaction(async (tx) => {
    if (id) {
      await lock(tx, id);
      const old = await row(tx, id);
      if (old.version !== expectedVersion) throw conflict();
      if (old.status !== "RASCUNHO")
        throw new AppError("CONFLICT", "Reabra o orçamento antes de editar.");
    }
    if (
      input.customerId &&
      !(await tx.customer.findFirst({
        where: { id: input.customerId, active: true },
      }))
    )
      throw new AppError("VALIDATION", "Selecione um cliente ativo.");
    const totals =
      input.items &&
      input.discount !== undefined &&
      input.shipping !== undefined
        ? calculateDocumentTotals(input.items, input.discount, input.shipping)
        : null;
    const data = {
      input: input as Prisma.InputJsonValue,
      customerId: input.customerId ?? null,
      validUntil: input.validUntil ? civilDateToDb(input.validUntil) : null,
      totals: totals ? { ...totals } : Prisma.DbNull,
    };
    const q = id
      ? await tx.quote.update({
          where: { id },
          data: { ...data, version: { increment: 1 } },
        })
      : await tx.quote.create({ data });
    await tx.quoteItem.deleteMany({ where: { quoteId: q.id } });
    if (input.items)
      await tx.quoteItem.createMany({
        data: input.items.map((i, position) => ({
          ...i,
          quoteId: q.id,
          position,
        })),
      });
    await quoteEvent(tx, actor, q.id, id ? "EDIT" : "CREATE");
    return dto(await row(tx, q.id));
  });
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
    await lock(tx, id);
    const q = await row(tx, id);
    if (q.version !== expectedVersion) throw conflict();
    const status = dto(q).status;
    let data: Prisma.QuoteUpdateInput = { version: { increment: 1 } };
    if (action === "ISSUE") {
      if (status !== "RASCUNHO") throw conflict();
      const input = quoteSchema.parse(q.input);
      if (input.validUntil < todaySaoPaulo(new Date()))
        throw new AppError(
          "VALIDATION",
          "A validade não pode estar no passado.",
        );
      const { snapshot, logo } = await createDocumentSnapshot(
        tx,
        input,
        `/api/quotes/${id}/logo`,
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
    await quoteEvent(tx, actor, id, action);
    return dto(await row(tx, id));
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
      ...(f.from ? { gte: civilDateToDb(f.from) } : {}),
      ...(f.to
        ? { lt: new Date(civilDateToDb(f.to).getTime() + 86400000) }
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
  return { items: rows.map(dto), total, page: f.page, pageSize: f.pageSize };
}
