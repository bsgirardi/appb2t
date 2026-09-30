import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { assertAdmin } from "../auth/authorization";
import type { Actor } from "../auth/session";
import { transferSchema, reversalSchema } from "@/domain/finance/validation";
import { FinanceDecimal } from "@/domain/finance/balances";
import { civilDateFromDb, civilDateToDb } from "@/domain/commerce/dates";
import type { TransferDTO } from "@/domain/finance/types";
import { lockAccounts, requireMovementAccount } from "./accounts";
import { runFinanceCommand } from "./commands";
import { audit, movementDTO } from "./audit";

async function transferRow(tx: Prisma.TransactionClient, id: string) {
  const row = await tx.financialTransfer.findUnique({ where: { id }, include: { movements: { include: { reversedBy: true }, orderBy: { id: "asc" } } } });
  if (!row) throw new AppError("NOT_FOUND", "Transferência não encontrada.");
  return row;
}
function transferDTO(row: Awaited<ReturnType<typeof transferRow>>): TransferDTO {
  return { id: row.id, fromAccountId: row.fromAccountId, toAccountId: row.toAccountId, amount: row.amount.toFixed(2), effectiveDate: civilDateFromDb(row.effectiveDate), description: row.description, reversed: row.movements.some(m => m.reversedBy !== null), movements: row.movements.map(movementDTO) };
}
async function incrementAccounts(tx: Prisma.TransactionClient, ids: string[]) {
  await tx.financialAccount.updateMany({ where: { id: { in: ids } }, data: { version: { increment: 1 } } });
}
export async function transferFunds(actor: Actor, raw: unknown): Promise<TransferDTO> {
  assertAdmin(actor);
  const input = transferSchema.parse(raw);
  return runFinanceCommand(actor, input.operationKey, "TRANSFER", input, async tx => {
    const ids = [input.fromAccountId, input.toAccountId];
    await lockAccounts(tx, ids);
    for (const id of ids) await requireMovementAccount(tx, id, input.effectiveDate);
    const transfer = await tx.financialTransfer.create({ data: { fromAccountId: input.fromAccountId, toAccountId: input.toAccountId, amount: input.amount, effectiveDate: civilDateToDb(input.effectiveDate), description: input.description } });
    for (const accountId of ids) await tx.cashMovement.create({ data: { accountId, amount: accountId === input.fromAccountId ? new FinanceDecimal(input.amount).negated().toFixed(2) : input.amount, effectiveDate: transfer.effectiveDate, kind: "TRANSFER", description: input.description, actorId: actor.id, actorName: actor.name, transferId: transfer.id } });
    await incrementAccounts(tx, ids);
    await audit(tx, actor, "TRANSFER", transfer.id, "TRANSFER", { fromAccountId: input.fromAccountId, toAccountId: input.toAccountId, amount: input.amount, effectiveDate: input.effectiveDate });
    return transferDTO(await transferRow(tx, transfer.id));
  });
}
export async function reverseTransfer(actor: Actor, id: string, raw: unknown): Promise<TransferDTO> {
  assertAdmin(actor);
  const input = reversalSchema.parse(raw);
  return runFinanceCommand(actor, input.operationKey, "REVERSE_TRANSFER", { id, ...input }, async tx => {
    const initial = await transferRow(tx, id);
    const ids = [initial.fromAccountId, initial.toAccountId];
    await lockAccounts(tx, ids);
    const row = await transferRow(tx, id);
    if (row.movements.length !== 2 || row.movements.some(m => m.reversedBy)) throw new AppError("CONFLICT", "Transferência já estornada ou inconsistente.");
    if (input.effectiveDate < civilDateFromDb(row.effectiveDate)) throw new AppError("VALIDATION", "O estorno não pode ser anterior à transferência.");
    for (const accountId of ids) await requireMovementAccount(tx, accountId, input.effectiveDate);
    for (const original of row.movements) await tx.cashMovement.create({ data: { accountId: original.accountId, amount: new FinanceDecimal(original.amount.toString()).negated().toFixed(2), effectiveDate: civilDateToDb(input.effectiveDate), kind: "REVERSAL", description: input.reason, actorId: actor.id, actorName: actor.name, reversalOfId: original.id } });
    await incrementAccounts(tx, ids);
    await audit(tx, actor, "TRANSFER", id, "REVERSE_TRANSFER", { effectiveDate: input.effectiveDate, amount: row.amount.toFixed(2) }, input.reason);
    return transferDTO(await transferRow(tx, id));
  });
}
export async function reverseAdjustment(actor: Actor, id: string, raw: unknown) {
  assertAdmin(actor);
  const input = reversalSchema.parse(raw);
  return runFinanceCommand(actor, input.operationKey, "REVERSE_ADJUSTMENT", { id, ...input }, async tx => {
    const initial = await tx.cashMovement.findUnique({ where: { id } });
    if (!initial) throw new AppError("NOT_FOUND", "Movimento não encontrado.");
    await lockAccounts(tx, [initial.accountId]);
    const original = await tx.cashMovement.findUniqueOrThrow({ where: { id }, include: { reversedBy: true } });
    if (original.kind !== "ADJUSTMENT" || original.reversedBy || original.transferId || original.settlementId) throw new AppError("CONFLICT", "Somente ajustes ainda não estornados podem ser revertidos aqui.");
    if (input.effectiveDate < civilDateFromDb(original.effectiveDate)) throw new AppError("VALIDATION", "O estorno não pode ser anterior ao ajuste.");
    await requireMovementAccount(tx, original.accountId, input.effectiveDate);
    const inverse = await tx.cashMovement.create({ data: { accountId: original.accountId, amount: new FinanceDecimal(original.amount.toString()).negated().toFixed(2), effectiveDate: civilDateToDb(input.effectiveDate), kind: "REVERSAL", description: input.reason, actorId: actor.id, actorName: actor.name, reversalOfId: original.id } });
    await incrementAccounts(tx, [original.accountId]);
    await audit(tx, actor, "MOVEMENT", id, "REVERSE_ADJUSTMENT", { movementId: inverse.id, effectiveDate: input.effectiveDate }, input.reason);
    return movementDTO(inverse);
  });
}
