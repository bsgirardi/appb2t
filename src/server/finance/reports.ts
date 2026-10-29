import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assertAdmin } from "../auth/authorization";
import type { Actor } from "../auth/session";
import {
  financeFilterSchema,
  type FinanceFilter,
} from "@/domain/finance/validation";
import { FinanceDecimal as D } from "@/domain/finance/balances";
import { projectCashFlow } from "@/domain/finance/projection";
import { csvMoney, csvText } from "@/domain/finance/csv";
import {
  civilDateFromDb,
  civilDateToDb,
  todaySaoPaulo,
} from "@/domain/commerce/dates";
import type {
  CashDay,
  FinanceDashboardDTO,
  MovementDTO,
  MovementTotals,
} from "@/domain/finance/types";
import type { Page } from "@/domain/shared/pagination";
import { entrySelectionSql } from "./entries";
import { movementDTO } from "./audit";
import { getAccountBalance } from "./accounts";

function filter(raw: unknown) {
  const f = financeFilterSchema.parse(raw);
  if (f.dateFrom && f.dateTo && f.dateFrom > f.dateTo)
    throw new AppError(
      "VALIDATION",
      "A data inicial deve ser anterior à final.",
    );
  return f;
}
async function movementWhere(
  tx: Prisma.TransactionClient,
  f: FinanceFilter,
): Promise<Prisma.CashMovementWhereInput> {
  const and: Prisma.CashMovementWhereInput[] = [];
  if (f.accountId) and.push({ accountId: f.accountId });
  if (f.categoryId) and.push({ categoryId: f.categoryId });
  if (f.dateFrom || f.dateTo)
    and.push({
      effectiveDate: {
        ...(f.dateFrom ? { gte: civilDateToDb(f.dateFrom) } : {}),
        ...(f.dateTo ? { lte: civilDateToDb(f.dateTo) } : {}),
      },
    });
  if (f.search)
    and.push({ description: { contains: f.search, mode: "insensitive" } });
  if (f.kind) {
    const kind = f.kind === "RECEIVABLE" ? "RECEIPT" : "PAYMENT";
    and.push({ OR: [{ kind }, { reversalOf: { kind } }] });
  }
  const entry: Prisma.FinancialEntryWhereInput = {};
  if (f.state || f.overdue) {
    const rows = await selectedEntries(tx, {
      ...f,
      dateFrom: undefined,
      dateTo: undefined,
      search: "",
      accountId: undefined,
      categoryId: undefined,
    });
    entry.id = { in: rows.map((row) => row.id) };
  }
  if (f.counterparty)
    entry.counterparty = { contains: f.counterparty, mode: "insensitive" };
  if (f.saleId)
    entry.OR = [
      { saleInstallment: { saleId: f.saleId } },
      { consignmentLink: { consignmentSale: { saleId: f.saleId } } },
    ];
  if (f.groupId) entry.groupId = f.groupId;
  if (Object.keys(entry).length)
    and.push({
      OR: [
        { settlement: { entry } },
        { reversalOf: { settlement: { entry } } },
      ],
    });
  return { AND: and };
}
type SumMovement = {
  amount: Prisma.Decimal;
  kind: string;
  reversalOf: { kind: string } | null;
};
function totals(rows: SumMovement[]): MovementTotals {
  let incoming = new D(0),
    outgoing = new D(0),
    transfers = new D(0),
    adjustments = new D(0),
    net = new D(0);
  for (const row of rows) {
    const amount = new D(row.amount.toString()),
      kind = row.kind === "REVERSAL" ? row.reversalOf?.kind : row.kind;
    net = net.plus(amount);
    if (kind === "RECEIPT") incoming = incoming.plus(amount);
    if (kind === "PAYMENT") outgoing = outgoing.minus(amount);
    if (kind === "TRANSFER") transfers = transfers.plus(amount);
    if (kind === "ADJUSTMENT") adjustments = adjustments.plus(amount);
  }
  return {
    incoming: incoming.toFixed(2),
    outgoing: outgoing.toFixed(2),
    transfersNet: transfers.toFixed(2),
    adjustmentsNet: adjustments.toFixed(2),
    net: net.toFixed(2),
  };
}
const movementInclude = { reversalOf: { select: { kind: true } } } as const;
async function currentBalance(
  tx: Prisma.TransactionClient,
  accountId?: string,
  asOf = todaySaoPaulo(new Date()),
) {
  const accounts = await tx.financialAccount.findMany({
    where: accountId ? { id: accountId } : {},
  });
  let balance = new D(0),
    unknown = false;
  for (const account of accounts) {
    const value = await getAccountBalance(tx, account.id, asOf);
    if (value === null) unknown = true;
    else balance = balance.plus(value);
  }
  return { balance: balance.toFixed(2), unknown };
}
type EntryAggregateRow = {
  id: string;
  dueDate: Date;
  kind: "RECEIVABLE" | "PAYABLE";
  amount: Prisma.Decimal;
  paid: Prisma.Decimal;
  canceledAt: Date | null;
};
async function selectedEntries(tx: Prisma.TransactionClient, f: FinanceFilter) {
  return tx.$queryRaw<EntryAggregateRow[]>(entrySelectionSql(f));
}
export async function listMovements(
  actor: Actor,
  raw: unknown = {},
): Promise<Page<MovementDTO> & { totals: MovementTotals }> {
  assertAdmin(actor);
  const f = filter(raw);
  return db.$transaction(
    async (tx) => {
      const where = await movementWhere(tx, f);
      const rows = await tx.cashMovement.findMany({
        where,
        include: { reversedBy: { select: { id: true } } },
        orderBy: [{ effectiveDate: "desc" }, { id: "desc" }],
        skip: (f.page - 1) * f.pageSize,
        take: f.pageSize,
      });
      const all = await tx.cashMovement.findMany({
        where,
        select: { amount: true, kind: true, ...movementInclude },
      });
      return {
        items: rows.map(movementDTO),
        total: all.length,
        page: f.page,
        pageSize: f.pageSize,
        totals: totals(all),
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function getFinanceDashboard(
  actor: Actor,
  raw: unknown = {},
): Promise<FinanceDashboardDTO> {
  assertAdmin(actor);
  const f = filter(raw),
    today = todaySaoPaulo(new Date());
  return db.$transaction(
    async (tx) => {
      const entries = await selectedEntries(tx, f);
      let rp = new D(0),
        ro = new D(0),
        pp = new D(0),
        po = new D(0);
      for (const entry of entries) {
        if (entry.canceledAt) continue;
        const remaining = new D(entry.amount.toString()).minus(
            entry.paid.toString(),
          ),
          overdue = civilDateFromDb(entry.dueDate) < today;
        if (entry.kind === "RECEIVABLE") {
          rp = rp.plus(remaining);
          if (overdue) ro = ro.plus(remaining);
        } else {
          pp = pp.plus(remaining);
          if (overdue) po = po.plus(remaining);
        }
      }
      const movements = totals(
        await tx.cashMovement.findMany({
          where: await movementWhere(tx, f),
          include: movementInclude,
        }),
      );
      return {
        balance: (await currentBalance(tx, f.accountId)).balance,
        receivablePending: rp.toFixed(2),
        receivableOverdue: ro.toFixed(2),
        payablePending: pp.toFixed(2),
        payableOverdue: po.toFixed(2),
        realizedIn: movements.incoming,
        realizedOut: movements.outgoing,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function getCashFlow(
  actor: Actor,
  raw: unknown = {},
): Promise<{ realized: CashDay[]; projected: CashDay[]; overdueNet: string }> {
  assertAdmin(actor);
  const f = filter(raw),
    today = todaySaoPaulo(new Date());
  return db.$transaction(
    async (tx) => {
      const rows = await tx.cashMovement.findMany({
        where: await movementWhere(tx, f),
        include: movementInclude,
        orderBy: { effectiveDate: "asc" },
      });
      const grouped = new Map<string, typeof rows>();
      for (const row of rows) {
        const day = civilDateFromDb(row.effectiveDate);
        grouped.set(day, [...(grouped.get(day) ?? []), row]);
      }
      if (f.dateFrom && !grouped.has(f.dateFrom)) grouped.set(f.dateFrom, []);
      if (f.dateTo && !grouped.has(f.dateTo)) grouped.set(f.dateTo, []);
      const realized: CashDay[] = [];
      for (const [date, movements] of [...grouped].sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        const balance = await currentBalance(tx, f.accountId, date);
        realized.push({
          date,
          ...totals(movements),
          closingBalance: balance.unknown ? null : balance.balance,
        });
      }
      // Include overdue obligations and intervening dates when calculating the running projection.
      const entries = await selectedEntries(tx, { ...f, dateFrom: undefined });
      const projection = projectCashFlow(
        (await currentBalance(tx, f.accountId)).balance,
        today,
        entries
          .filter((e) => !e.canceledAt)
          .map((e) => ({
            dueDate: civilDateFromDb(e.dueDate),
            kind: e.kind,
            remainingAmount: new D(e.amount.toString())
              .minus(e.paid.toString())
              .toFixed(2),
          })),
      );
      return {
        realized,
        overdueNet: projection.overdueNet,
        projected: projection.projected.filter(
          (day) =>
            (!f.dateFrom || day.date >= f.dateFrom) &&
            (!f.dateTo || day.date <= f.dateTo),
        ),
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function exportFinanceCsv(
  actor: Actor,
  raw: unknown = {},
): Promise<string> {
  assertAdmin(actor);
  const f = filter(raw);
  return db.$transaction(
    async (tx) => {
      const rows = await tx.cashMovement.findMany({
        where: await movementWhere(tx, f),
        include: { account: true, category: true },
        orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
        take: 10001,
      });
      if (rows.length > 10000)
        throw new AppError(
          "VALIDATION",
          "A exportação excede 10.000 registros. Reduza o período ou aplique filtros.",
        );
      const lines = [
        "Data;Conta;Categoria;Tipo;Descrição;Valor;Autor;ID;Estorno de",
      ];
      for (const row of rows)
        lines.push(
          [
            csvText(civilDateFromDb(row.effectiveDate)),
            csvText(row.account.name),
            csvText(row.category?.name ?? ""),
            csvText(row.kind),
            csvText(row.description),
            csvMoney(row.amount.toFixed(2)),
            csvText(row.actorName),
            csvText(row.id),
            csvText(row.reversalOfId ?? ""),
          ].join(";"),
        );
      return `\uFEFF${lines.join("\r\n")}\r\n`;
    },
    { isolationLevel: "RepeatableRead" },
  );
}
