import { prepareSaleProductionCancellation } from "./production/lifecycle";
import {
  releaseSaleReservations,
  assertSaleReservationsResolved,
} from "./stock/reservations";
import {
  readDocumentCosts,
  readLineItems,
  prepareLineItems,
  itemColumns,
  saveDocumentCosts,
  freezeDocumentCosts,
  copyQuoteCostsToSale,
} from "./pricing/document-costs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "./auth/session";
import type {
  DocumentInput,
  DocumentTotals,
  DocumentSnapshot,
  InstallmentInput,
  SaleDTO,
  SaleStatus,
} from "@/domain/commerce/types";
import {
  documentSchema,
  civilDateSchema,
  costBindingsSchema,
} from "@/domain/commerce/validation";
import { calculateDocumentTotals } from "@/domain/commerce/totals";
import { validateInstallments } from "@/domain/commerce/installments";
import {
  civilDateFromDb,
  civilDateToDb,
  todaySaoPaulo,
} from "@/domain/commerce/dates";
import {
  assertSaleTransition,
  effectiveQuoteStatus,
} from "@/domain/commerce/states";
import { paginationSchema, type Page } from "@/domain/shared/pagination";
import { lockCommerce, lockOperation } from "./commerce/locks";
import { lockPlanning } from "./planning/coordination";
import { reconcilePlanningTx } from "./planning/invariants";
import { createDocumentSnapshot } from "./commerce/snapshots";
import {
  createSaleReceivables,
  getSaleReceiptSummary,
} from "./finance/entries";
import { quoteEvent } from "./commerce/audit";
import { kitDiscountReviewSchema } from "@/domain/kits/document";
import { enforceKitDocumentEdit } from "./kits/document-history";
async function event(
  tx: Prisma.TransactionClient,
  actor: Actor,
  saleId: string,
  action: string,
  reason = "",
) {
  await tx.commerceEvent.create({
    data: { saleId, action, reason, actorId: actor.id, actorName: actor.name },
  });
}
async function row(tx: Prisma.TransactionClient, id: string) {
  const sale = await tx.sale.findUnique({
    where: { id },
    include: {
      installments: { orderBy: { number: "asc" } },
      events: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
  });
  if (!sale) throw new AppError("NOT_FOUND", "Venda não encontrada.");
  return sale;
}
async function dto(tx: Prisma.TransactionClient, id: string): Promise<SaleDTO> {
  const s = await row(tx, id);
  return {
    id: s.id,
    number: `VEN-${String(s.sequence).padStart(6, "0")}`,
    quoteId: s.quoteId,
    status: s.status,
    fulfillmentMode: s.fulfillmentMode as "LEGACY" | "U3",
    version: s.version,
    document: {
      ...(s.document as unknown as DocumentInput),
      items: await readLineItems(
        tx,
        { saleId: id },
        (s.document as unknown as DocumentInput).items,
      ),
    },
    costs: await readDocumentCosts(tx, { saleId: id }, s.costRevisionId),
    totals: s.totals as unknown as DocumentTotals,
    snapshot: s.snapshot as unknown as DocumentSnapshot | null,
    installments: s.installments.map((i) => ({
      number: i.number,
      amount: i.amount.toFixed(2),
      dueDate: civilDateFromDb(i.dueDate),
    })),
    receiptSummary: await getSaleReceiptSummary(tx, id),
    expectedDeliveryDate: s.expectedDeliveryDate
      ? civilDateFromDb(s.expectedDeliveryDate)
      : null,
    operationalNotes: s.operationalNotes,
    events: s.events.map((e) => ({
      id: e.id,
      action: e.action,
      reason: e.reason,
      actorName: e.actorName,
      createdAt: e.createdAt.toISOString(),
    })),
    createdAt: s.createdAt.toISOString(),
  };
}
export async function getSale(_actor: Actor, id: string) {
  return db.$transaction((tx) => dto(tx, id), {
    isolationLevel: "RepeatableRead",
  });
}
export async function saveSaleDraft(
  actor: Actor,
  id: string | undefined,
  raw: unknown,
): Promise<SaleDTO> {
  const { expectedVersion, costBindings, kitDiscountReview, ...document } =
    documentSchema
      .extend({
        expectedVersion: z.number().int().positive().optional(),
        costBindings: costBindingsSchema.optional(),
        kitDiscountReview: kitDiscountReviewSchema.optional(),
      })
      .parse(raw);
  const totals = calculateDocumentTotals(
    document.items,
    document.discount,
    document.shipping,
  );
  return db.$transaction(async (tx) => {
    let previousRevisionId: string | null = null;
    let kitDiscountReviewed = false;
    if (
      !id &&
      (document.catalogKits || document.items.some((i) => i.catalogOrigin))
    )
      throw new AppError(
        "VALIDATION",
        "A origem recebida deve vir de um orçamento preparado pela solicitação.",
      );
    if (id) {
      await lockCommerce(tx, { saleId: id });
      const old = await row(tx, id);
      previousRevisionId = old.costRevisionId;
      if (old.version !== expectedVersion || old.status !== "RASCUNHO")
        throw conflict();
      kitDiscountReviewed = enforceKitDocumentEdit(
        old.document as unknown as DocumentInput,
        document,
        kitDiscountReview,
      );
    }
    const previous = await readDocumentCosts(
      tx,
      { saleId: id ?? "" },
      previousRevisionId,
    );
    document.items = prepareLineItems(
      document.items,
      !!previous?.bindings.length,
    );
    if (
      !(await tx.customer.findFirst({
        where: { id: document.customerId, active: true },
      }))
    )
      throw new AppError("VALIDATION", "Selecione um cliente ativo.");
    const data = {
      customerId: document.customerId,
      document: document as unknown as Prisma.InputJsonValue,
      totals: { ...totals },
    };
    const sale = id
      ? await tx.sale.update({
          where: { id },
          data: { ...data, version: { increment: 1 } },
        })
      : await tx.sale.create({ data });
    await tx.saleItem.deleteMany({ where: { saleId: sale.id } });
    await tx.saleItem.createMany({
      data: document.items.map((i, position) => ({
        ...itemColumns(i, position),
        saleId: sale.id,
        position,
      })),
    });
    const costRevisionId = await saveDocumentCosts(
      tx,
      actor,
      { saleId: sale.id },
      document.items,
      costBindings,
      previousRevisionId,
    );
    await tx.sale.update({ where: { id: sale.id }, data: { costRevisionId } });
    await event(tx, actor, sale.id, id ? "EDIT" : "CREATE");
    if (kitDiscountReviewed)
      await event(
        tx,
        actor,
        sale.id,
        "KIT_DISCOUNT_REVIEW",
        `Desconto revisado para os valores da versão ${sale.version}.`,
      );
    return dto(tx, sale.id);
  });
}
function fingerprint(value: unknown): string {
  function canonical(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, canonical(v)]),
      );
    return v;
  }
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}
async function idempotent(
  key: string,
  type: string,
  payload: unknown,
  run: (tx: Prisma.TransactionClient) => Promise<SaleDTO>,
): Promise<SaleDTO> {
  const operationKey = `commerce:${z.string().min(8).max(160).parse(key)}`,
    payloadHash = fingerprint(payload);
  return db.$transaction(
    async (tx) => {
      await lockOperation(tx, operationKey);
      const old = await tx.commercialOperation.findUnique({
        where: { key: operationKey },
      });
      if (old) {
        if (old.type !== type || old.payloadHash !== payloadHash)
          throw conflict();
        return old.result as unknown as SaleDTO;
      }
      const result = await run(tx);
      await tx.commercialOperation.create({
        data: {
          key: operationKey,
          type,
          payloadHash,
          result: result as unknown as Prisma.InputJsonValue,
        },
      });
      return result;
    },
    { maxWait: 10000, timeout: 20000 },
  );
}
async function installments(
  tx: Prisma.TransactionClient,
  saleId: string,
  rows: InstallmentInput[],
) {
  await tx.saleInstallment.createMany({
    data: rows.map((i) => ({
      ...i,
      saleId,
      dueDate: civilDateToDb(i.dueDate),
    })),
  });
  await createSaleReceivables(tx, saleId);
}
export async function confirmSale(
  actor: Actor,
  id: string,
  expectedVersion: number,
  rows: InstallmentInput[],
  operationKey: string,
): Promise<SaleDTO> {
  z.number().int().positive().parse(expectedVersion);
  return idempotent(
    operationKey,
    "CONFIRM",
    { id, expectedVersion, rows },
    async (tx) => {
      await lockCommerce(tx, { saleId: id });
      const sale = await row(tx, id);
      if (sale.version !== expectedVersion || sale.status !== "RASCUNHO")
        throw conflict();
      const input = documentSchema.parse(sale.document),
        totals = calculateDocumentTotals(
          input.items,
          input.discount,
          input.shipping,
        );
      const valid = validateInstallments(totals.total, rows);
      await freezeDocumentCosts(tx, sale.costRevisionId);
      const { snapshot, logo } = await createDocumentSnapshot(
        tx,
        input,
        `/api/sales/${id}/logo`,
      );
      await tx.sale.update({
        where: { id },
        data: {
          status: "CONFIRMADA",
          fulfillmentMode: "U3",
          version: { increment: 1 },
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          totals: { ...totals },
        },
      });
      if (logo)
        await tx.documentLogo.create({
          data: {
            saleId: id,
            bytes: new Uint8Array(logo.bytes),
            mimeType: logo.mimeType,
          },
        });
      await installments(tx, id, valid);
      await event(tx, actor, id, "CONFIRM");
      return dto(tx, id);
    },
  );
}
export async function convertQuote(
  actor: Actor,
  quoteId: string,
  expectedVersion: number,
  rows: InstallmentInput[],
  operationKey: string,
): Promise<SaleDTO> {
  z.number().int().positive().parse(expectedVersion);
  return idempotent(
    operationKey,
    "CONVERT",
    { quoteId, expectedVersion, rows },
    async (tx) => {
      await lockCommerce(tx, { quoteId });
      const q = await tx.quote.findUnique({
        where: { id: quoteId },
        include: { logo: true },
      });
      if (!q) throw new AppError("NOT_FOUND", "Orçamento não encontrado.");
      if (
        q.version !== expectedVersion ||
        !q.validUntil ||
        effectiveQuoteStatus(
          q.status,
          civilDateFromDb(q.validUntil),
          todaySaoPaulo(new Date()),
        ) !== "APROVADO"
      )
        throw conflict();
      const { validUntil: _validUntil, ...document } =
        q.input as unknown as DocumentInput & { validUntil: string };
      void _validUntil;
      document.items = await readLineItems(tx, { quoteId }, document.items);
      if (
        !(await tx.customer.findFirst({
          where: { id: document.customerId, active: true },
        }))
      )
        throw new AppError("VALIDATION", "O cliente precisa estar ativo.");
      const totals = q.totals as unknown as DocumentTotals,
        valid = validateInstallments(totals.total, rows);
      const snapshot = q.snapshot as unknown as DocumentSnapshot;
      const sale = await tx.sale.create({
        data: {
          quoteId,
          customerId: document.customerId,
          document: document as unknown as Prisma.InputJsonValue,
          totals: { ...totals },
          status: "CONFIRMADA",
          fulfillmentMode: "U3",
        },
      });
      const frozen = {
        ...snapshot,
        company: {
          ...snapshot.company,
          logoUrl: q.logo ? `/api/sales/${sale.id}/logo` : null,
        },
      };
      await tx.sale.update({
        where: { id: sale.id },
        data: { snapshot: frozen as unknown as Prisma.InputJsonValue },
      });
      if (q.logo)
        await tx.documentLogo.create({
          data: {
            saleId: sale.id,
            bytes: q.logo.bytes,
            mimeType: q.logo.mimeType,
          },
        });
      await tx.saleItem.createMany({
        data: document.items.map((i, position) => ({
          ...itemColumns(i, position),
          saleId: sale.id,
          position,
        })),
      });
      const costRevisionId = await copyQuoteCostsToSale(tx, quoteId, sale.id);
      await tx.sale.update({
        where: { id: sale.id },
        data: { costRevisionId },
      });
      await installments(tx, sale.id, valid);
      await tx.quote.update({
        where: { id: quoteId },
        data: { status: "CONVERTIDO", version: { increment: 1 } },
      });
      await quoteEvent(tx, actor, quoteId, "CONVERT");
      await event(tx, actor, sale.id, "CONVERT");
      return dto(tx, sale.id);
    },
  );
}
export async function cancelSale(
  actor: Actor,
  id: string,
  expectedVersion: number,
  reason: string,
  entryGuard?: { id: string; expectedVersion: number },
): Promise<SaleDTO> {
  z.number().int().positive().parse(expectedVersion);
  const why = z.string().trim().min(3).max(2000).parse(reason);
  return db.$transaction(async (tx) => {
    await lockPlanning(tx);
    await lockCommerce(tx, { saleId: id });
    const sale = await row(tx, id);
    if (sale.version !== expectedVersion) throw conflict();
    assertSaleTransition(sale.status, "CANCELADA");
    await prepareSaleProductionCancellation(tx, actor, id);
    await releaseSaleReservations(tx, actor, id);
    const entries = await tx.financialEntry.findMany({
      where: { saleInstallment: { saleId: id } },
      select: { id: true },
    });
    await lockCommerce(tx, { entryIds: entries.map((e) => e.id) });
    if (entryGuard) {
      const guarded = await tx.financialEntry.findUnique({
        where: { id: entryGuard.id },
      });
      if (
        !entries.some((e) => e.id === entryGuard.id) ||
        guarded?.version !== entryGuard.expectedVersion
      )
        throw conflict();
    }
    const summary = await getSaleReceiptSummary(tx, id);
    if (summary.received !== "0.00")
      throw new AppError(
        "CONFLICT",
        "Estorne os recebimentos antes de cancelar a venda.",
      );
    await tx.financialEntry.updateMany({
      where: { id: { in: entries.map((e) => e.id) }, canceledAt: null },
      data: { canceledAt: new Date(), version: { increment: 1 } },
    });
    await tx.sale.update({
      where: { id },
      data: { status: "CANCELADA", version: { increment: 1 } },
    });
    await event(tx, actor, id, "CANCEL", why);
    await reconcilePlanningTx(tx);
    await tx.planningState.update({
      where: { id: 1 },
      data: { revision: { increment: 1 } },
    });
    return dto(tx, id);
  });
}
export async function transitionSale(
  actor: Actor,
  id: string,
  expectedVersion: number,
  status: SaleStatus,
  reason?: string,
): Promise<SaleDTO> {
  if (status === "CANCELADA")
    return cancelSale(actor, id, expectedVersion, reason ?? "");
  if (!["EM_PRODUCAO", "PRONTA", "ENTREGUE"].includes(status))
    throw new AppError("VALIDATION", "Use a confirmação com parcelamento.");
  z.number().int().positive().parse(expectedVersion);
  return db.$transaction(async (tx) => {
    await lockCommerce(tx, { saleId: id });
    const sale = await row(tx, id);
    if (sale.version !== expectedVersion) throw conflict();
    if (sale.fulfillmentMode === "U3")
      throw new AppError(
        "VALIDATION",
        "Use produção e entregas para atualizar esta venda.",
      );
    assertSaleTransition(sale.status, status);
    if (status === "ENTREGUE") await assertSaleReservationsResolved(tx, id);
    await tx.sale.update({
      where: { id },
      data: { status, version: { increment: 1 } },
    });
    await event(tx, actor, id, status);
    return dto(tx, id);
  });
}
export async function updateSaleOperations(
  actor: Actor,
  id: string,
  expectedVersion: number,
  raw: unknown,
): Promise<SaleDTO> {
  const input = z
    .object({
      expectedDeliveryDate: civilDateSchema.nullable(),
      operationalNotes: z.string().trim().max(2000),
    })
    .strict()
    .parse(raw);
  z.number().int().positive().parse(expectedVersion);
  return db.$transaction(async (tx) => {
    await lockCommerce(tx, { saleId: id });
    const sale = await row(tx, id);
    if (sale.version !== expectedVersion) throw conflict();
    await tx.sale.update({
      where: { id },
      data: {
        ...input,
        expectedDeliveryDate: input.expectedDeliveryDate
          ? civilDateToDb(input.expectedDeliveryDate)
          : null,
        version: { increment: 1 },
      },
    });
    await event(tx, actor, id, "OPERATIONS");
    return dto(tx, id);
  });
}
export const saleFilterSchema = paginationSchema.extend({
  status: z
    .enum([
      "all",
      "realizadas",
      "RASCUNHO",
      "CONFIRMADA",
      "EM_PRODUCAO",
      "PRONTA",
      "ENTREGUE",
      "CANCELADA",
    ])
    .default("all"),
  customerId: z.string().optional(),
  from: civilDateSchema.optional(),
  to: civilDateSchema.optional(),
});
export async function listSales(
  _actor: Actor,
  raw: unknown = {},
): Promise<Page<SaleDTO>> {
  const f = saleFilterSchema.parse(raw),
    where: Prisma.SaleWhereInput = {
      ...(f.status === "realizadas"
        ? { status: { notIn: ["RASCUNHO", "CANCELADA"] as const } }
        : f.status !== "all"
          ? { status: f.status }
          : {}),
      ...(f.customerId ? { customerId: f.customerId } : {}),
    };
  if (f.search) {
    const n = Number(f.search.replace(/^VEN-/i, ""));
    where.OR = [
      { customer: { name: { contains: f.search, mode: "insensitive" } } },
      ...(Number.isSafeInteger(n) && n > 0 ? [{ sequence: n }] : []),
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
  return db.$transaction(
    async (tx) => {
      const rows = await tx.sale.findMany({
        where,
        select: { id: true },
        orderBy: { sequence: "desc" },
        skip: (f.page - 1) * f.pageSize,
        take: f.pageSize,
      });
      const total = await tx.sale.count({ where });
      const items = [];
      for (const row of rows) items.push(await dto(tx, row.id));
      return { items, total, page: f.page, pageSize: f.pageSize };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
