import type { Prisma } from "@prisma/client";
import { AppError, conflict } from "@/lib/errors";
import { assertAdmin } from "../auth/authorization";
import type { Actor } from "../auth/session";
import { settlementSchema, reversalSchema } from "@/domain/finance/validation";
import { FinanceDecimal } from "@/domain/finance/balances";
import { civilDateToDb, civilDateFromDb } from "@/domain/commerce/dates";
import type { SettlementDTO } from "@/domain/finance/types";
import { lockCommerce } from "../commerce/locks";
import { lockAccounts, requireMovementAccount } from "./accounts";
import { entryRow, entryDTO, settlementDTO } from "./entries";
import { runFinanceCommand } from "./commands";
import { audit } from "./audit";
export async function lockFinancialEntry(
  tx: Prisma.TransactionClient,
  entryId: string,
) {
  const origin = await tx.financialEntry.findUnique({
    where: { id: entryId },
    select: { saleInstallment: { select: { saleId: true } } },
  });
  if (!origin) throw new AppError("NOT_FOUND", "Lançamento não encontrado.");
  await lockCommerce(tx, {
    saleId: origin.saleInstallment?.saleId,
    entryIds: [entryId],
  });
  const row = await entryRow(tx, entryId);
  if (row.saleInstallment?.saleId !== origin.saleInstallment?.saleId)
    throw conflict();
  return row;
}
async function settlementRow(tx: Prisma.TransactionClient, id: string) {
  const row = await tx.settlement.findUnique({
    where: { id },
    include: { movement: { include: { reversedBy: true } } },
  });
  if (!row) throw new AppError("NOT_FOUND", "Baixa não encontrada.");
  return row;
}
export async function settleEntry(
  actor: Actor,
  raw: unknown,
): Promise<SettlementDTO> {
  assertAdmin(actor);
  const input = settlementSchema.parse(raw);
  return runFinanceCommand(
    actor,
    input.operationKey,
    "SETTLE",
    input,
    async (tx) => {
      const row = await lockFinancialEntry(tx, input.entryId);
      if (row.version !== input.expectedVersion || row.canceledAt)
        throw conflict();
      const entry = entryDTO(row);
      if (new FinanceDecimal(input.amount).gt(entry.remainingAmount))
        throw new AppError(
          "VALIDATION",
          "O valor supera o saldo restante da obrigação.",
        );
      await lockAccounts(tx, [input.accountId]);
      await requireMovementAccount(tx, input.accountId, input.effectiveDate);
      const settlement = await tx.settlement.create({
        data: {
          entryId: row.id,
          accountId: input.accountId,
          amount: input.amount,
          effectiveDate: civilDateToDb(input.effectiveDate),
          method: input.method,
          notes: input.notes,
        },
      });
      const signed =
        row.kind === "RECEIVABLE"
          ? input.amount
          : new FinanceDecimal(input.amount).negated().toFixed(2);
      await tx.cashMovement.create({
        data: {
          accountId: input.accountId,
          categoryId: row.categoryId,
          amount: signed,
          effectiveDate: civilDateToDb(input.effectiveDate),
          kind: row.kind === "RECEIVABLE" ? "RECEIPT" : "PAYMENT",
          description: row.description,
          actorId: actor.id,
          actorName: actor.name,
          settlementId: settlement.id,
        },
      });
      await tx.financialEntry.update({
        where: { id: row.id },
        data: { version: { increment: 1 } },
      });
      await tx.financialAccount.update({
        where: { id: input.accountId },
        data: { version: { increment: 1 } },
      });
      await audit(
        tx,
        actor,
        "ENTRY",
        row.id,
        "SETTLE",
        {
          settlementId: settlement.id,
          amount: input.amount,
          accountId: input.accountId,
          effectiveDate: input.effectiveDate,
          method: input.method,
        },
        input.notes,
      );
      return settlementDTO(await settlementRow(tx, settlement.id));
    },
  );
}
export async function reverseSettlement(
  actor: Actor,
  id: string,
  raw: unknown,
): Promise<SettlementDTO> {
  assertAdmin(actor);
  const input = reversalSchema.parse(raw);
  return runFinanceCommand(
    actor,
    input.operationKey,
    "REVERSE_SETTLEMENT",
    { id, ...input },
    async (tx) => {
      const initial = await settlementRow(tx, id);
      await lockFinancialEntry(tx, initial.entryId);
      const settlement = await settlementRow(tx, id);
      const original = settlement.movement;
      if (!original || original.reversedBy)
        throw new AppError(
          "CONFLICT",
          "Esta baixa já foi estornada ou não possui movimento válido.",
        );
      if (input.effectiveDate < civilDateFromDb(original.effectiveDate))
        throw new AppError(
          "VALIDATION",
          "O estorno não pode ser anterior à baixa.",
        );
      await lockAccounts(tx, [original.accountId]);
      await requireMovementAccount(tx, original.accountId, input.effectiveDate);
      await tx.cashMovement.create({
        data: {
          accountId: original.accountId,
          categoryId: original.categoryId,
          amount: new FinanceDecimal(original.amount.toString())
            .negated()
            .toFixed(2),
          effectiveDate: civilDateToDb(input.effectiveDate),
          kind: "REVERSAL",
          description: input.reason,
          actorId: actor.id,
          actorName: actor.name,
          reversalOfId: original.id,
        },
      });
      await tx.financialEntry.update({
        where: { id: settlement.entryId },
        data: { version: { increment: 1 } },
      });
      await tx.financialAccount.update({
        where: { id: original.accountId },
        data: { version: { increment: 1 } },
      });
      await audit(
        tx,
        actor,
        "ENTRY",
        settlement.entryId,
        "REVERSE_SETTLEMENT",
        {
          settlementId: id,
          amount: settlement.amount.toFixed(2),
          effectiveDate: input.effectiveDate,
        },
        input.reason,
      );
      return settlementDTO(await settlementRow(tx, id));
    },
  );
}
