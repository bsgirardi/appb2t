import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { idSchema, operationKeySchema } from "@/domain/consignment/validation";
import {
  competenceRange,
  statementState,
} from "@/domain/consignment/statements";
import { StockDecimal as D } from "@/domain/stock/quantities";
import { factsHash } from "@/server/profitability/commands";
import { lockCommerce } from "@/server/commerce/locks";
import { readConsignmentReceiptSummary } from "./finance";
import { requireConsignmentActor } from "./authorization";
import { partnerRow } from "./partners";
import { lockConsignment } from "./locks";
import { runConsignmentCommand } from "./commands";
const competenceSchema = z.string().refine((v) => {
  try {
    competenceRange(v);
    return true;
  } catch {
    return false;
  }
}, "Competência inválida.");
const schema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("CLOSE"),
      operationKey: operationKeySchema,
      partnerId: idSchema,
      competence: competenceSchema,
      fingerprint: z.string().length(64),
    })
    .strict(),
  z
    .object({
      type: z.literal("CANCEL"),
      operationKey: operationKeySchema,
      id: idSchema,
      expectedVersion: z.number().int().positive(),
      reason: z.string().trim().min(3).max(2000),
    })
    .strict(),
]);
async function previewWithClient(
  tx: Prisma.TransactionClient,
  partnerId: string,
  competence: string,
) {
  await partnerRow(tx, partnerId);
  const range = competenceRange(competence);
  const sales = await tx.consignmentSale.findMany({
    where: {
      partnerId,
      status: "CONFIRMED",
      effectiveDate: {
        gte: new Date(range.from + "T00:00:00Z"),
        lt: new Date(range.until + "T00:00:00Z"),
      },
      statementLines: { none: { active: true } },
    },
    orderBy: { id: "asc" },
  });
  const lines = await Promise.all(
    sales.map(async (s) => ({
      id: s.id,
      saleId: s.saleId!,
      reference: s.reference,
      version: s.version,
      model: s.model,
      totals: s.totals,
      finance: await readConsignmentReceiptSummary(tx, s.saleId!),
    })),
  );
  const totals = {
    gross: "0.00",
    commission: "0.00",
    receivable: "0.00",
    payable: "0.00",
  };
  for (const l of lines)
    for (const k of Object.keys(totals) as (keyof typeof totals)[])
      totals[k] = new D(totals[k])
        .plus((l.totals as unknown as Record<string, string>)[k])
        .toFixed(2);
  return {
    partnerId,
    competence,
    lines,
    totals,
    fingerprint: factsHash({ partnerId, competence, lines }),
  };
}
export async function previewStatement(
  actor: Actor,
  partnerId: string,
  competence: string,
) {
  assertAdmin(actor);
  idSchema.parse(partnerId);
  competenceSchema.parse(competence);
  return db.$transaction(
    async (tx) => {
      await requireConsignmentActor(tx, actor, true);
      return previewWithClient(tx, partnerId, competence);
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
export type StatementPreviewDTO = Awaited<ReturnType<typeof previewStatement>>;
export async function statementDTO(tx: Prisma.TransactionClient, id: string) {
  const s = await tx.consignmentStatement.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          consignmentSale: { select: { saleId: true, reference: true } },
        },
      },
    },
  });
  if (!s) throw new AppError("NOT_FOUND", "Acerto não encontrado.");
  const lines = await Promise.all(
    s.lines.map(async (l) => ({
      ...l,
      finance: await readConsignmentReceiptSummary(
        tx,
        l.consignmentSale.saleId!,
      ),
    })),
  );
  const links = lines
    .flatMap((l) => l.finance?.links ?? [])
    .filter((l) => !l.canceled);
  return {
    ...s,
    createdAt: s.createdAt.toISOString(),
    lines,
    state: statementState(links, s.status === "CANCELED"),
  };
}
export type StatementDTO = Awaited<ReturnType<typeof statementDTO>>;
export async function executeStatementCommand(
  actor: Actor,
  raw: unknown,
): Promise<StatementDTO> {
  assertAdmin(actor);
  const v = schema.parse(raw);
  return runConsignmentCommand(actor, "STATEMENT_" + v.type, v, async (tx) => {
    await requireConsignmentActor(tx, actor, true);
    if (v.type === "CLOSE") {
      await lockConsignment(tx, { partnerId: v.partnerId });
      let preview = await previewWithClient(tx, v.partnerId, v.competence);
      if (!preview.lines.length)
        throw new AppError(
          "VALIDATION",
          "Não há vendas elegíveis para fechar.",
        );
      await lockConsignment(tx, {
        partnerId: v.partnerId,
        consignmentSaleIds: preview.lines.map((l) => l.id),
      });
      for (const l of preview.lines)
        await lockCommerce(tx, { saleId: l.saleId });
      await lockCommerce(tx, {
        entryIds: preview.lines.flatMap(
          (l) => l.finance?.links.map((x) => x.id) ?? [],
        ),
      });
      preview = await previewWithClient(tx, v.partnerId, v.competence);
      if (preview.fingerprint !== v.fingerprint) throw conflict();
      const statement = await tx.consignmentStatement.create({
        data: {
          partnerId: v.partnerId,
          competence: v.competence,
          actorId: actor.id,
          snapshot: preview as unknown as Prisma.InputJsonValue,
          lines: {
            create: preview.lines.map((l) => ({
              consignmentSaleId: l.id,
              snapshot: l as unknown as Prisma.InputJsonValue,
            })),
          },
        },
      });
      await tx.consignmentEvent.create({
        data: {
          partnerId: v.partnerId,
          kind: "STATEMENT_CLOSE",
          actorId: actor.id,
          actorName: actor.name,
          effectiveDate: new Date(),
          changes: { statementId: statement.id, fingerprint: v.fingerprint },
        },
      });
      return statementDTO(tx, statement.id);
    }
    const pre = await tx.consignmentStatement.findUnique({
      where: { id: v.id },
    });
    if (!pre) throw new AppError("NOT_FOUND", "Acerto não encontrado.");
    await lockConsignment(tx, {
      partnerId: pre.partnerId,
      statementIds: [v.id],
    });
    const s = await statementDTO(tx, v.id);
    if (s.version !== v.expectedVersion || s.status === "CANCELED")
      throw conflict();
    const entryIds = s.lines.flatMap(
      (l) => l.finance?.links.map((e) => e.id) ?? [],
    );
    await lockCommerce(tx, { entryIds });
    const current = await statementDTO(tx, v.id);
    if (
      current.lines.some((l) =>
        l.finance?.links.some((e) => new D(e.settled).gt(0)),
      )
    )
      throw new AppError(
        "CONFLICT",
        "Estorne as baixas antes de cancelar o acerto.",
      );
    await tx.consignmentStatementLine.updateMany({
      where: { statementId: s.id },
      data: { active: false },
    });
    await tx.consignmentStatement.update({
      where: { id: s.id },
      data: { status: "CANCELED", reason: v.reason, version: { increment: 1 } },
    });
    await tx.consignmentEvent.create({
      data: {
        partnerId: pre.partnerId,
        kind: "STATEMENT_CANCEL",
        actorId: actor.id,
        actorName: actor.name,
        effectiveDate: new Date(),
        reason: v.reason,
        changes: { statementId: s.id },
      },
    });
    return statementDTO(tx, s.id);
  });
}
