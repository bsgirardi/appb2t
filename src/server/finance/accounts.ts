import type { Prisma, FinancialAccount } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import { assertAdmin } from "../auth/authorization";
import type { Actor } from "../auth/session";
import {
  civilDateFromDb,
  civilDateToDb,
  todaySaoPaulo,
} from "@/domain/commerce/dates";
import { FinanceDecimal } from "@/domain/finance/balances";
import { accountSchema, adjustmentSchema } from "@/domain/finance/validation";
import type { AccountDTO } from "@/domain/finance/types";
import { runFinanceCommand } from "./commands";
import { audit, movementDTO } from "./audit";
export async function lockAccounts(
  tx: Prisma.TransactionClient,
  ids: string[],
) {
  for (const id of [...new Set(ids)].sort())
    await tx.$queryRaw`SELECT id FROM "FinancialAccount" WHERE id=${id} FOR UPDATE`;
}
export async function getAccountBalance(
  tx: Prisma.TransactionClient,
  accountId: string,
  asOf: string,
): Promise<string | null> {
  const account = await tx.financialAccount.findUnique({
    where: { id: accountId },
  });
  if (!account) throw new AppError("NOT_FOUND", "Conta não encontrada.");
  const date = civilDateToDb(asOf);
  if (date < account.openingDate) return null;
  const sum = await tx.cashMovement.aggregate({
    where: { accountId, effectiveDate: { lte: date } },
    _sum: { amount: true },
  });
  return new FinanceDecimal(account.openingBalance.toString())
    .plus(sum._sum.amount?.toString() ?? "0")
    .toFixed(2);
}
async function dto(
  tx: Prisma.TransactionClient,
  account: FinancialAccount,
): Promise<AccountDTO> {
  const balance = await getAccountBalance(
    tx,
    account.id,
    todaySaoPaulo(new Date()),
  );
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    openingBalance: account.openingBalance.toFixed(2),
    openingDate: civilDateFromDb(account.openingDate),
    active: account.active,
    version: account.version,
    balance,
    negative: balance !== null && new FinanceDecimal(balance).lt(0),
  };
}
export async function listAccounts(actor: Actor): Promise<AccountDTO[]> {
  assertAdmin(actor);
  return db.$transaction(
    async (tx) => {
      const rows = await tx.financialAccount.findMany({
        orderBy: { name: "asc" },
      });
      const items = [];
      for (const row of rows) items.push(await dto(tx, row));
      return items;
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function saveAccount(
  actor: Actor,
  id: string | undefined,
  raw: unknown,
): Promise<AccountDTO> {
  assertAdmin(actor);
  const { expectedVersion, ...input } = accountSchema.parse(raw);
  if (input.openingDate > todaySaoPaulo(new Date()))
    throw new AppError(
      "VALIDATION",
      "A abertura da conta não pode estar no futuro.",
    );
  return db.$transaction(async (tx) => {
    let old: FinancialAccount | null = null;
    if (id) {
      await lockAccounts(tx, [id]);
      old = await tx.financialAccount.findUnique({ where: { id } });
      if (!old || old.version !== expectedVersion) throw conflict();
      const moved = await tx.cashMovement.count({ where: { accountId: id } });
      if (
        moved &&
        (old.openingBalance.toFixed(2) !== input.openingBalance ||
          civilDateFromDb(old.openingDate) !== input.openingDate)
      )
        throw new AppError(
          "CONFLICT",
          "Após movimentações, corrija o saldo por ajuste.",
        );
    }
    const data = { ...input, openingDate: civilDateToDb(input.openingDate) };
    const account = id
      ? await tx.financialAccount.update({
          where: { id },
          data: { ...data, version: { increment: 1 } },
        })
      : await tx.financialAccount.create({ data });
    if (
      !account.active &&
      (await getAccountBalance(tx, account.id, todaySaoPaulo(new Date()))) !==
        "0.00"
    )
      throw new AppError(
        "CONFLICT",
        "A conta precisa ter saldo zero para ser inativada.",
      );
    await audit(tx, actor, "ACCOUNT", account.id, id ? "EDIT" : "CREATE", {
      before: old
        ? {
            name: old.name,
            type: old.type,
            openingBalance: old.openingBalance.toFixed(2),
            openingDate: civilDateFromDb(old.openingDate),
            active: old.active,
          }
        : null,
      after: input,
    });
    return dto(tx, account);
  });
}
export async function requireMovementAccount(
  tx: Prisma.TransactionClient,
  id: string,
  effectiveDate: string,
) {
  const account = await tx.financialAccount.findUnique({ where: { id } });
  if (!account?.active)
    throw new AppError("VALIDATION", "Selecione uma conta ativa.");
  if (
    effectiveDate > todaySaoPaulo(new Date()) ||
    effectiveDate < civilDateFromDb(account.openingDate)
  )
    throw new AppError(
      "VALIDATION",
      "A data deve estar entre a abertura da conta e hoje.",
    );
  return account;
}
export async function recordAdjustment(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const input = adjustmentSchema.parse(raw);
  return runFinanceCommand(
    actor,
    input.operationKey,
    "ADJUSTMENT",
    input,
    async (tx) => {
      await lockAccounts(tx, [input.accountId]);
      const account = await requireMovementAccount(
        tx,
        input.accountId,
        input.effectiveDate,
      );
      if (account.version !== input.expectedVersion) throw conflict();
      const movement = await tx.cashMovement.create({
        data: {
          accountId: account.id,
          amount: input.amount,
          effectiveDate: civilDateToDb(input.effectiveDate),
          kind: "ADJUSTMENT",
          description: input.reason,
          actorId: actor.id,
          actorName: actor.name,
        },
      });
      await tx.financialAccount.update({
        where: { id: account.id },
        data: { version: { increment: 1 } },
      });
      await audit(
        tx,
        actor,
        "MOVEMENT",
        movement.id,
        "ADJUSTMENT",
        {
          amount: input.amount,
          accountId: account.id,
          effectiveDate: input.effectiveDate,
        },
        input.reason,
      );
      return movementDTO(movement);
    },
  );
}
