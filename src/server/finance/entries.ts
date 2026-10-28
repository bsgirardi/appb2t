import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import { assertAdmin } from "../auth/authorization";
import type { Actor } from "../auth/session";
import { FinanceDecimal, entryState } from "@/domain/finance/balances";
import type {
  EntryDTO,
  SettlementDTO,
  FinancialEventDTO,
} from "@/domain/finance/types";
import type { Page } from "@/domain/shared/pagination";
import type { InstallmentInput } from "@/domain/commerce/types";
import { validateInstallments } from "@/domain/commerce/installments";
import { lockCommerce } from "../commerce/locks";
import { runFinanceCommand } from "./commands";
import { audit } from "./audit";
import { cancelSale } from "../sales";
import {
  assertStandaloneEntry,
  readConsignmentReceiptSummary,
} from "../consignment/finance";
import type {
  DocumentSnapshot,
  DocumentTotals,
  ReceiptSummary,
} from "@/domain/commerce/types";
import {
  civilDateToDb,
  civilDateFromDb,
  todaySaoPaulo,
} from "@/domain/commerce/dates";
import {
  SALE_REVENUE_ID,
  entrySchema,
  financeFilterSchema,
  type FinanceFilter,
} from "@/domain/finance/validation";
const include = {
  consignmentLink: {
    include: {
      consignmentSale: {
        select: {
          id: true,
          partnerId: true,
          sale: { select: { id: true, sequence: true } },
        },
      },
    },
  },
  receiptLink: true,
  saleInstallment: {
    include: { sale: { select: { id: true, sequence: true, version: true } } },
  },
  settlements: { include: { movement: { include: { reversedBy: true } } } },
} as const;
type EntryRow = Prisma.FinancialEntryGetPayload<{ include: typeof include }>;
function paidFor(row: EntryRow) {
  return row.settlements
    .filter((s) => s.movement && !s.movement.reversedBy)
    .reduce((sum, s) => sum.plus(s.amount.toString()), new FinanceDecimal(0))
    .toFixed(2);
}
export function entryDTO(row: EntryRow): EntryDTO {
  return {
    consignmentPartnerId:
      row.consignmentLink?.consignmentSale.partnerId ?? null,
    consignmentSaleId: row.consignmentLink?.consignmentSale.id ?? null,
    id: row.id,
    receiptId: row.receiptLink?.receiptId ?? null,
    kind: row.kind,
    amount: row.amount.toFixed(2),
    dueDate: civilDateFromDb(row.dueDate),
    description: row.description,
    counterparty: row.counterparty,
    customerId: row.customerId,
    saleInstallmentId: row.saleInstallmentId,
    canceledAt: row.canceledAt?.toISOString() ?? null,
    version: row.version,
    categoryId: row.categoryId,
    groupId: row.groupId,
    ...entryState(
      row.amount.toString(),
      paidFor(row),
      !!row.canceledAt,
      civilDateFromDb(row.dueDate),
      todaySaoPaulo(new Date()),
    ),
    saleId:
      row.saleInstallment?.sale.id ??
      row.consignmentLink?.consignmentSale.sale?.id ??
      null,
    saleNumber: row.saleInstallment
      ? `VEN-${String(row.saleInstallment.sale.sequence).padStart(6, "0")}`
      : row.consignmentLink?.consignmentSale.sale
        ? `VEN-${String(row.consignmentLink.consignmentSale.sale.sequence).padStart(6, "0")}`
        : null,
    installmentNumber: row.saleInstallment?.number ?? null,
  };
}
export async function entryRow(tx: Prisma.TransactionClient, id: string) {
  const row = await tx.financialEntry.findUnique({ where: { id }, include });
  if (!row) throw new AppError("NOT_FOUND", "Lançamento não encontrado.");
  return row;
}
export function settlementDTO(
  s: EntryRow["settlements"][number],
): SettlementDTO {
  return {
    id: s.id,
    entryId: s.entryId,
    accountId: s.accountId,
    amount: s.amount.toFixed(2),
    method: s.method,
    effectiveDate: civilDateFromDb(s.effectiveDate),
    notes: s.notes,
    movementId: s.movement?.id ?? null,
    reversed: !!s.movement?.reversedBy,
    createdAt: s.createdAt.toISOString(),
  };
}
async function validateReferences(
  tx: Prisma.TransactionClient,
  input: z.infer<typeof entrySchema>,
) {
  await tx.$queryRaw`SELECT id FROM "FinancialCategory" WHERE id=${input.categoryId} FOR SHARE`;
  const category = await tx.financialCategory.findUnique({
    where: { id: input.categoryId },
  });
  if (
    !category?.active ||
    category.kind !== (input.kind === "RECEIVABLE" ? "REVENUE" : "EXPENSE")
  )
    throw new AppError(
      "VALIDATION",
      "Selecione uma categoria ativa compatível com o lançamento.",
    );
  if (
    input.customerId &&
    !(await tx.customer.findFirst({
      where: { id: input.customerId, active: true },
    }))
  )
    throw new AppError("VALIDATION", "Selecione um cliente ativo.");
}
async function insertEntry(
  tx: Prisma.TransactionClient,
  actor: Actor,
  input: z.infer<typeof entrySchema>,
  groupId: string | null = null,
) {
  const { expectedVersion, ...data } = input;
  void expectedVersion;
  const row = await tx.financialEntry.create({
    data: {
      ...data,
      customerId: data.customerId ?? null,
      dueDate: civilDateToDb(data.dueDate),
      groupId,
    },
    include,
  });
  await audit(tx, actor, "ENTRY", row.id, "CREATE", data);
  return entryDTO(row);
}
export async function createEntry(
  actor: Actor,
  raw: unknown,
): Promise<EntryDTO> {
  assertAdmin(actor);
  const input = entrySchema.parse(raw);
  return db.$transaction(async (tx) => {
    await validateReferences(tx, input);
    return insertEntry(tx, actor, input);
  });
}
export async function createEntryGroup(
  actor: Actor,
  raw: unknown,
  rows: InstallmentInput[],
  operationKey: string,
): Promise<EntryDTO[]> {
  assertAdmin(actor);
  const input = entrySchema.parse(raw),
    valid = validateInstallments(input.amount, rows);
  return runFinanceCommand(
    actor,
    operationKey,
    "ENTRY_GROUP",
    { input, installments: valid },
    async (tx) => {
      await validateReferences(tx, input);
      const groupId = randomUUID(),
        result = [];
      for (const row of valid)
        result.push(
          await insertEntry(
            tx,
            actor,
            { ...input, amount: row.amount, dueDate: row.dueDate },
            groupId,
          ),
        );
      return result;
    },
  );
}
export async function getEntry(
  actor: Actor,
  id: string,
): Promise<
  EntryDTO & { settlements: SettlementDTO[]; events: FinancialEventDTO[] }
> {
  assertAdmin(actor);
  return db.$transaction(
    async (tx) => {
      const row = await entryRow(tx, id),
        events = await tx.financialAuditEvent.findMany({
          where: { entityType: "ENTRY", entityId: id },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });
      return {
        ...entryDTO(row),
        settlements: row.settlements.map(settlementDTO),
        events: events.map((e) => ({
          id: e.id,
          action: e.action,
          reason: e.reason,
          actorName: e.actorName,
          createdAt: e.createdAt.toISOString(),
        })),
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function updateEntry(
  actor: Actor,
  id: string,
  raw: unknown,
): Promise<EntryDTO> {
  assertAdmin(actor);
  const { expectedVersion, ...input } = entrySchema
    .extend({ expectedVersion: z.number().int().positive() })
    .parse(raw);
  return db.$transaction(async (tx) => {
    await lockCommerce(tx, { entryIds: [id] });
    await assertStandaloneEntry(tx, id);
    const old = await entryRow(tx, id);
    if (await tx.receiptFinancialLink.findUnique({ where: { entryId: id } }))
      throw new AppError(
        "CONFLICT",
        "Altere esta obrigação pelo recebimento de compra de origem.",
      );
    if (old.version !== expectedVersion || old.canceledAt) throw conflict();
    if (old.saleInstallmentId)
      throw new AppError(
        "CONFLICT",
        "O lançamento pertence a uma venda e não pode ser editado avulsamente.",
      );
    if (input.kind !== old.kind)
      throw new AppError(
        "VALIDATION",
        "O tipo do lançamento não pode ser alterado.",
      );
    if (
      paidFor(old) !== "0.00" &&
      (input.amount !== old.amount.toFixed(2) ||
        input.dueDate !== civilDateFromDb(old.dueDate))
    )
      throw new AppError(
        "CONFLICT",
        "Estorne as baixas antes de alterar valor ou vencimento.",
      );
    await validateReferences(tx, input);
    const updated = await tx.financialEntry.update({
      where: { id },
      data: {
        ...input,
        customerId: input.customerId ?? null,
        dueDate: civilDateToDb(input.dueDate),
        version: { increment: 1 },
      },
      include,
    });
    await audit(tx, actor, "ENTRY", id, "EDIT", {
      before: entryDTO(old) as unknown as Prisma.InputJsonValue,
      after: input,
    });
    return entryDTO(updated);
  });
}
export async function cancelEntry(
  actor: Actor,
  id: string,
  expectedVersion: number,
  reason: string,
): Promise<EntryDTO> {
  assertAdmin(actor);
  z.number().int().positive().parse(expectedVersion);
  const why = z.string().trim().min(3).max(2000).parse(reason);
  const origin = await entryRow(db, id);
  await assertStandaloneEntry(db, id);
  if (origin.saleInstallment) {
    await cancelSale(
      actor,
      origin.saleInstallment.saleId,
      origin.saleInstallment.sale.version,
      why,
      { id, expectedVersion },
    );
    return entryDTO(await entryRow(db, id));
  }
  return db.$transaction(async (tx) => {
    await lockCommerce(tx, { entryIds: [id] });
    await assertStandaloneEntry(tx, id);
    const old = await entryRow(tx, id);
    if (await tx.receiptFinancialLink.findUnique({ where: { entryId: id } }))
      throw new AppError(
        "CONFLICT",
        "Altere esta obrigação pelo recebimento de compra de origem.",
      );
    if (old.version !== expectedVersion || old.canceledAt) throw conflict();
    if (paidFor(old) !== "0.00")
      throw new AppError("CONFLICT", "Estorne as baixas antes de cancelar.");
    const updated = await tx.financialEntry.update({
      where: { id },
      data: { canceledAt: new Date(), version: { increment: 1 } },
      include,
    });
    await audit(tx, actor, "ENTRY", id, "CANCEL", {}, why);
    return entryDTO(updated);
  });
}
export function entrySelectionSql(f: FinanceFilter) {
  const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (f.kind) conditions.push(Prisma.sql`e.kind::text=${f.kind}`);
  if (f.categoryId) conditions.push(Prisma.sql`e."categoryId"=${f.categoryId}`);
  if (f.dateFrom)
    conditions.push(Prisma.sql`e."dueDate">=${civilDateToDb(f.dateFrom)}`);
  if (f.dateTo)
    conditions.push(Prisma.sql`e."dueDate"<=${civilDateToDb(f.dateTo)}`);
  if (f.groupId) conditions.push(Prisma.sql`e."groupId"=${f.groupId}`);
  if (f.saleId)
    conditions.push(
      Prisma.sql`(EXISTS(SELECT 1 FROM "SaleInstallment" si WHERE si.id=e."saleInstallmentId" AND si."saleId"=${f.saleId}) OR EXISTS(SELECT 1 FROM "ConsignmentFinancialLink" cl JOIN "ConsignmentSale" cs ON cs.id=cl."consignmentSaleId" WHERE cl."entryId"=e.id AND cs."saleId"=${f.saleId}))`,
    );
  if (f.counterparty)
    conditions.push(
      Prisma.sql`strpos(lower(e.counterparty),lower(${f.counterparty}))>0`,
    );
  if (f.search)
    conditions.push(
      Prisma.sql`(strpos(lower(e.description),lower(${f.search}))>0 OR strpos(lower(e.counterparty),lower(${f.search}))>0)`,
    );
  if (f.accountId)
    conditions.push(
      Prisma.sql`EXISTS(SELECT 1 FROM "Settlement" a WHERE a."entryId"=e.id AND a."accountId"=${f.accountId})`,
    );
  if (f.state === "CANCELADO")
    conditions.push(Prisma.sql`e."canceledAt" IS NOT NULL`);
  else if (f.state) {
    conditions.push(Prisma.sql`e."canceledAt" IS NULL`);
    if (f.state === "ABERTO") conditions.push(Prisma.sql`coalesce(p.paid,0)=0`);
    if (f.state === "PARCIAL")
      conditions.push(
        Prisma.sql`coalesce(p.paid,0)>0 AND coalesce(p.paid,0)<e.amount`,
      );
    if (f.state === "LIQUIDADO")
      conditions.push(Prisma.sql`coalesce(p.paid,0)=e.amount`);
  }
  const overdue = Prisma.sql`(e."canceledAt" IS NULL AND e.amount>coalesce(p.paid,0) AND e."dueDate"<${civilDateToDb(todaySaoPaulo(new Date()))})`;
  if (f.overdue)
    conditions.push(
      f.overdue === "true" ? overdue : Prisma.sql`NOT ${overdue}`,
    );
  return Prisma.sql`WITH paid AS (SELECT s."entryId",sum(s.amount) AS paid FROM "Settlement" s JOIN "CashMovement" m ON m."settlementId"=s.id LEFT JOIN "CashMovement" r ON r."reversalOfId"=m.id WHERE r.id IS NULL GROUP BY s."entryId") SELECT e.id,e."dueDate",e.kind,e.amount,e."canceledAt",coalesce(p.paid,0) AS paid FROM "FinancialEntry" e LEFT JOIN paid p ON p."entryId"=e.id WHERE ${Prisma.join(conditions, " AND ")}`;
}
export async function listEntries(
  actor: Actor,
  raw: unknown = {},
): Promise<Page<EntryDTO>> {
  assertAdmin(actor);
  const f = financeFilterSchema.parse(raw),
    query = entrySelectionSql(f);
  return db.$transaction(
    async (tx) => {
      const ids = await tx.$queryRaw<{ id: string }[]>(
          Prisma.sql`SELECT id FROM (${query}) filtered ORDER BY "dueDate",id OFFSET ${(f.page - 1) * f.pageSize} LIMIT ${f.pageSize}`,
        ),
        count = await tx.$queryRaw<{ count: bigint }[]>(
          Prisma.sql`SELECT count(*) AS count FROM (${query}) filtered`,
        );
      const items = [];
      for (const id of ids) items.push(entryDTO(await entryRow(tx, id.id)));
      return {
        items,
        total: Number(count[0].count),
        page: f.page,
        pageSize: f.pageSize,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function createSaleReceivables(
  tx: Prisma.TransactionClient,
  saleId: string,
) {
  const sale = await tx.sale.findUniqueOrThrow({
    where: { id: saleId },
    include: { installments: true },
  });
  const snapshot = sale.snapshot as unknown as DocumentSnapshot;
  await tx.financialEntry.createMany({
    data: sale.installments.map((p) => ({
      kind: "RECEIVABLE",
      categoryId: SALE_REVENUE_ID,
      amount: p.amount,
      dueDate: p.dueDate,
      description: `VEN-${String(sale.sequence).padStart(6, "0")} · Parcela ${p.number}`,
      counterparty: snapshot.customer.name,
      customerId: sale.customerId,
      saleInstallmentId: p.id,
    })),
  });
}
export async function getSaleReceiptSummary(
  tx: Prisma.TransactionClient,
  saleId: string,
): Promise<ReceiptSummary> {
  const consignment = await readConsignmentReceiptSummary(tx, saleId);
  if (consignment)
    return {
      total: consignment.gross,
      received: consignment.receivedRepayment,
      pending: consignment.pendingRepayment,
      overdue: consignment.overdue,
      consignment,
    };
  const sale = await tx.sale.findUniqueOrThrow({ where: { id: saleId } });
  const entries = await tx.financialEntry.findMany({
    where: { saleInstallment: { saleId }, canceledAt: null },
    include,
  });
  const today = civilDateToDb(todaySaoPaulo(new Date()));
  return {
    total: (sale.totals as unknown as DocumentTotals).total,
    received: entries
      .reduce((sum, e) => sum.plus(paidFor(e)), new FinanceDecimal(0))
      .toFixed(2),
    pending: entries
      .reduce(
        (a, e) => a.plus(e.amount.toString()).minus(paidFor(e)),
        new FinanceDecimal(0),
      )
      .toFixed(2),
    overdue: entries
      .filter((e) => e.dueDate < today)
      .reduce(
        (a, e) => a.plus(e.amount.toString()).minus(paidFor(e)),
        new FinanceDecimal(0),
      )
      .toFixed(2),
  };
}
export async function createPurchasePayables(
  tx: Prisma.TransactionClient,
  actor: Actor,
  receiptId: string,
  raw: unknown,
  rows: InstallmentInput[],
): Promise<string[]> {
  assertAdmin(actor);
  const input = entrySchema.parse(raw);
  if (input.kind !== "PAYABLE")
    throw new AppError("VALIDATION", "Compra exige conta a pagar.");
  await validateReferences(tx, input);
  const valid = validateInstallments(input.amount, rows),
    groupId = randomUUID(),
    ids = [];
  for (const row of valid) {
    const created = await insertEntry(
      tx,
      actor,
      { ...input, amount: row.amount, dueDate: row.dueDate },
      groupId,
    );
    ids.push(created.id);
  }
  for (const entryId of ids)
    await tx.receiptFinancialLink.create({ data: { receiptId, entryId } });
  return ids;
}
