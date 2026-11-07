import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import Decimal from "decimal.js";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import { assertAdmin } from "@/server/auth/authorization";
import type { Actor } from "@/server/auth/session";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import type { DocumentInput, DocumentTotals } from "@/domain/commerce/types";
import { assessSaleTax } from "@/domain/tax/sale";
import { competenceSchema } from "@/domain/tax/validation";
import { resolveTaxProfile } from "@/domain/tax/periods";
import { readTaxProfiles } from "./profiles";
import {
  readDocumentCosts,
  readLineItems,
} from "@/server/pricing/document-costs";
import { lineFingerprint } from "@/domain/pricing/document-costs";
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export async function readTaxReport(
  tx: Prisma.TransactionClient,
  competence: string,
) {
  competenceSchema.parse(competence);
  const from = new Date(`${competence}-01T03:00:00Z`);
  const to = new Date(from);
  to.setUTCMonth(to.getUTCMonth() + 1);
  const profiles = await readTaxProfiles(tx),
    profile = resolveTaxProfile(profiles.profiles, competence);
  const sales = await tx.sale.findMany({
    where: {
      status: { notIn: ["RASCUNHO", "CANCELADA"] },
      taxConfirmedAt: { gte: from, lt: to },
    },
    orderBy: { sequence: "asc" },
  });
  const unassigned = await tx.sale.count({
    where: {
      status: { notIn: ["RASCUNHO", "CANCELADA"] },
      taxConfirmedAt: null,
    },
  });
  const rows = [];
  for (const sale of sales) {
    const doc = sale.document as unknown as DocumentInput,
      totals = sale.totals as unknown as DocumentTotals;
    const items = await readLineItems(tx, { saleId: sale.id }, doc.items);
    const costs = await readDocumentCosts(
      tx,
      { saleId: sale.id },
      sale.costRevisionId,
    );
    const result = assessSaleTax(
      items.map((item, position) => {
        const binding = costs?.bindings.find(
          (b) =>
            b.lineId === item.lineId &&
            b.state === "VALID" &&
            b.fingerprint === lineFingerprint(item),
        );
        const snapshot = costs?.snapshots.find(
          (s) =>
            s.id === binding?.snapshotId && s.input.quantity === item.quantity,
        );
        return {
          key: item.lineId!,
          position,
          gross: new D(item.unitPrice).times(item.quantity).toFixed(2),
          tax: snapshot?.input.tax,
        };
      }),
      totals.discount,
      totals.shipping,
      todaySaoPaulo(sale.taxConfirmedAt!).slice(0, 7),
    );
    rows.push({
      saleId: sale.id,
      number: `VEN-${String(sale.sequence).padStart(6, "0")}`,
      version: sale.version,
      costRevisionId: sale.costRevisionId,
      ...result,
    });
  }
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        competence,
        profileVersion: profiles.version,
        profile,
        rows,
        unassigned,
      }),
    )
    .digest("hex");
  return {
    fingerprint,
    algorithm: 1 as const,
    competence,
    readAt: new Date().toISOString(),
    profileVersion: profiles.version,
    monthlyDas: profile?.regime === "MEI" ? profile.monthlyDas : null,
    monthlyProfile: profile,
    knownSalesTax: rows
      .reduce((sum, r) => sum.plus(r.knownAmount), new D(0))
      .toFixed(2),
    uncoveredBase: rows
      .reduce((sum, r) => sum.plus(r.uncoveredBase), new D(0))
      .toFixed(2),
    completeSales: rows.filter((r) => r.complete).length,
    partialSales: rows.filter((r) => !r.complete).length,
    unassignedSales: unassigned,
    rows,
  };
}
export type TaxReport = Awaited<ReturnType<typeof readTaxReport>>;
export async function getTaxReport(actor: Actor, competence: string) {
  assertAdmin(actor);
  return db.$transaction((tx) => readTaxReport(tx, competence), {
    isolationLevel: "RepeatableRead",
  });
}
export async function listTaxMemories(actor: Actor, competence: string) {
  assertAdmin(actor);
  competenceSchema.parse(competence);
  const rows = await db.taxReportMemory.findMany({
    where: { competence },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    actorName: r.actorName,
    result: r.result as unknown as TaxReport,
  }));
}
export async function saveTaxMemory(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const request = z
    .object({
      competence: competenceSchema,
      operationKey: z.uuid(),
      expectedFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict()
    .parse(raw);
  const where = {
    actorId_operationKey: {
      actorId: actor.id,
      operationKey: request.operationKey,
    },
  };
  const replay = (row: { competence: string; id: string; result: unknown }) => {
    if (
      row.competence !== request.competence ||
      (row.result as TaxReport).fingerprint !== request.expectedFingerprint
    )
      throw conflict();
    return { id: row.id };
  };
  const old = await db.taxReportMemory.findUnique({ where });
  if (old) return replay(old);
  try {
    return await db.$transaction(
      async (tx) => {
        const result = await readTaxReport(tx, request.competence);
        if (result.fingerprint !== request.expectedFingerprint)
          throw conflict();
        const row = await tx.taxReportMemory.create({
          data: {
            competence: request.competence,
            operationKey: request.operationKey,
            actorId: actor.id,
            actorName: actor.name,
            result: result as unknown as Prisma.InputJsonValue,
          },
        });
        return { id: row.id };
      },
      { isolationLevel: "RepeatableRead" },
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const winner = await db.taxReportMemory.findUnique({ where });
      if (winner) return replay(winner);
    }
    throw e;
  }
}
export async function getTaxMemory(actor: Actor, id: string) {
  assertAdmin(actor);
  z.string().min(1).max(100).parse(id);
  const row = await db.taxReportMemory.findUnique({ where: { id } });
  if (!row)
    throw new AppError("NOT_FOUND", "Memória tributária não encontrada.");
  return {
    id: row.id,
    actorName: row.actorName,
    createdAt: row.createdAt.toISOString(),
    result: row.result as unknown as TaxReport,
  };
}
