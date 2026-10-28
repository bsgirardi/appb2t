import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { Actor } from "@/server/auth/session";
import { AppError } from "@/lib/errors";
import {
  opportunityFilterSchema,
  candidateFilterSchema,
} from "@/domain/opportunities/validation";
import {
  openStages,
  type OpportunityDTO,
  type OpportunityEventDTO,
  type OpportunityOptions,
  type OpportunityQuote,
} from "@/domain/opportunities/types";
import { paginationSchema, type Page } from "@/domain/shared/pagination";
import {
  civilDateToDb,
  civilDateFromDb,
  todaySaoPaulo,
} from "@/domain/commerce/dates";
import { effectiveQuoteStatus } from "@/domain/commerce/states";
import { readOpportunity, opportunityInclude, opportunityDTO } from "./read";
export async function getOpportunity(
  _actor: Actor,
  id: string,
): Promise<OpportunityDTO> {
  return db.$transaction((tx) => readOpportunity(tx, id), {
    isolationLevel: "RepeatableRead",
  });
}
export async function listOpportunities(
  actor: Actor,
  raw: unknown = {},
): Promise<Page<OpportunityDTO>> {
  const f = opportunityFilterSchema.parse(raw);
  const today = civilDateToDb(todaySaoPaulo(new Date()));
  const where: Prisma.OpportunityWhereInput = {};
  if (f.stage === "abertas") where.stage = { in: [...openStages] };
  else if (f.stage !== "todas") where.stage = f.stage;
  if (f.owner !== "todos")
    where.ownerId = f.owner === "eu" ? actor.id : f.owner;
  if (f.customerId) where.customerId = f.customerId;
  if (f.due !== "todas")
    where.nextContactDate = f.due === "hoje" ? today : { lt: today };
  if (f.search) {
    const seq = Number(f.search.replace(/^ORC-/i, ""));
    where.OR = [
      { title: { contains: f.search, mode: "insensitive" } },
      { customer: { name: { contains: f.search, mode: "insensitive" } } },
      ...(Number.isSafeInteger(seq) && seq > 0
        ? [{ quotes: { some: { sequence: seq } } }]
        : []),
    ];
  }
  return db.$transaction(
    async (tx) => {
      const [rows, total] = await Promise.all([
        tx.opportunity.findMany({
          where,
          include: opportunityInclude,
          orderBy: [
            { nextContactDate: { sort: "asc", nulls: "last" } },
            { updatedAt: "desc" },
            { id: "asc" },
          ],
          skip: (f.page - 1) * f.pageSize,
          take: f.pageSize,
        }),
        tx.opportunity.count({ where }),
      ]);
      return {
        items: rows.map(opportunityDTO),
        total,
        page: f.page,
        pageSize: f.pageSize,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function listOpportunityEvents(
  _actor: Actor,
  id: string,
  raw: unknown = {},
): Promise<Page<OpportunityEventDTO>> {
  const f = paginationSchema
    .extend({ pageSize: paginationSchema.shape.pageSize.default(20) })
    .parse(raw);
  return db.$transaction(
    async (tx) => {
      if (
        !(await tx.opportunity.findUnique({
          where: { id },
          select: { id: true },
        }))
      )
        throw new AppError("NOT_FOUND", "Oportunidade não encontrada.");
      const [rows, total] = await Promise.all([
        tx.opportunityEvent.findMany({
          where: { opportunityId: id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: f.pageSize,
          skip: (f.page - 1) * f.pageSize,
        }),
        tx.opportunityEvent.count({ where: { opportunityId: id } }),
      ]);
      return {
        items: rows.map((e) => ({
          id: e.id,
          type: e.type,
          authorKind: e.authorKind,
          actorName: e.actorName,
          createdAt: e.createdAt.toISOString(),
          data: e.data as Record<string, unknown>,
        })),
        total,
        page: f.page,
        pageSize: f.pageSize,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function opportunityOptions(
  _actor: Actor,
): Promise<OpportunityOptions> {
  void _actor;
  const [customers, owners] = await Promise.all([
    db.customer.findMany({
      where: { active: true },
      select: { id: true, name: true, active: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { active: true, role: { in: ["ADMIN", "OPERATOR"] } },
      select: { id: true, name: true, active: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { customers, owners };
}
export async function listOpportunityQuoteCandidates(
  _actor: Actor,
  raw: unknown,
): Promise<Page<OpportunityQuote>> {
  const f = candidateFilterSchema.parse(raw);
  return db.$transaction(
    async (tx) => {
      let customerId = f.customerId;
      if (f.opportunityId) {
        const o = await tx.opportunity.findUnique({
          where: { id: f.opportunityId },
          select: { customerId: true, stage: true },
        });
        if (!o) throw new AppError("NOT_FOUND", "Oportunidade não encontrada.");
        if (!([...openStages] as string[]).includes(o.stage))
          throw new AppError("CONFLICT", "A oportunidade está encerrada.");
        customerId = o.customerId;
      }
      const where: Prisma.QuoteWhereInput = {
        customerId,
        opportunityId: null,
        OR: [
          { sale: null },
          { sale: { status: { not: "CANCELADA" }, customerId } },
        ],
      };
      if (f.search) {
        const seq = Number(f.search.replace(/^ORC-/i, ""));
        if (!Number.isSafeInteger(seq) || seq < 1)
          return { items: [], total: 0, page: f.page, pageSize: f.pageSize };
        where.sequence = seq;
      }
      const [rows, total] = await Promise.all([
        tx.quote.findMany({
          where,
          select: {
            id: true,
            sequence: true,
            version: true,
            status: true,
            validUntil: true,
          },
          orderBy: { sequence: "desc" },
          skip: (f.page - 1) * f.pageSize,
          take: f.pageSize,
        }),
        tx.quote.count({ where }),
      ]);
      return {
        items: rows.map((q) => ({
          id: q.id,
          number: `ORC-${String(q.sequence).padStart(6, "0")}`,
          version: q.version,
          status: effectiveQuoteStatus(
            q.status,
            q.validUntil ? civilDateFromDb(q.validUntil) : "9999-12-31",
            todaySaoPaulo(new Date()),
          ),
        })),
        total,
        page: f.page,
        pageSize: f.pageSize,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function opportunityForQuote(actor: Actor, quoteId: string) {
  const q = await db.quote.findUnique({
    where: { id: quoteId },
    select: { opportunityId: true },
  });
  return q?.opportunityId ? getOpportunity(actor, q.opportunityId) : null;
}
