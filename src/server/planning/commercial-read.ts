import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import type { Prisma } from "@prisma/client";
import { quoteDraftSchema } from "@/domain/commerce/validation";
import { lineFingerprint } from "@/domain/pricing/document-costs";
import { pricingV2Schema } from "@/domain/pricing/validation";
import Decimal from "decimal.js";
import type {
  CommercialQuoteLine,
  CommercialEnvelope,
} from "@/domain/planning/commercial-types";
import { unknownCompletion } from "@/domain/planning/commercial-types";
import { completionSchema } from "@/domain/planning/commercial-validation";
import { projectSaleDemand } from "@/domain/planning/demand";
import { forecast } from "@/domain/planning/scheduler";
import { projectCompletion } from "@/domain/planning/completion";
import { authorizePlanning, loadPlanningSource } from "./forecast-input";
import { loadSaleDemand } from "./sale-demand";
import { balance } from "@/server/stock/movements";
export function envelope<T>(
  asOf: string,
  revision: number,
  kind: "quote" | "sale",
  id: string,
  version: number,
  facts: unknown,
  result: T,
): CommercialEnvelope<T> {
  return {
    asOf,
    expiresAt: new Date(Date.parse(asOf) + 60000).toISOString(),
    revision,
    source: {
      kind,
      id,
      version,
      fingerprint: createHash("sha256")
        .update(JSON.stringify(facts))
        .digest("hex"),
    },
    result,
  };
}
export async function loadCommercialContext(
  tx: Prisma.TransactionClient,
  actor: Actor,
  id: string,
  asOf: string,
) {
  await authorizePlanning(tx, actor);
  const o = await tx.opportunity.findUnique({
    where: { id },
    include: {
      principalQuote: {
        include: { items: { orderBy: { position: "asc" } }, sale: true },
      },
    },
  });
  if (!o) throw new AppError("NOT_FOUND", "Negociação não encontrada.");
  const q = o.principalQuote;
  const saleId = o.wonSaleId ?? q?.sale?.id ?? null;
  if (saleId)
    return {
      opportunityVersion: o.version,
      quoteId: q?.id ?? null,
      quoteVersion: q?.version ?? 0,
      saleId,
      lines: [] as CommercialQuoteLine[],
      warnings: [] as string[],
      stage: o.stage,
    };
  if (!q)
    return {
      opportunityVersion: o.version,
      quoteId: null,
      quoteVersion: 0,
      saleId: null,
      lines: [] as CommercialQuoteLine[],
      warnings: ["Defina um orçamento principal para simular."],
      stage: o.stage,
    };
  if (q.opportunityId !== o.id || q.customerId !== o.customerId)
    throw new AppError(
      "CONFLICT",
      "Confira o vínculo do orçamento principal e cliente.",
    );
  const parsed = quoteDraftSchema.safeParse(q.input);
  if (!parsed.success)
    throw new AppError(
      "CONFLICT",
      "Revise os dados do orçamento principal antes de simular.",
    );
  const items = parsed.data.items ?? [];
  const revision = q.costRevisionId
    ? await tx.documentCostRevision.findUnique({
        where: { id: q.costRevisionId },
      })
    : null;
  const bindings = z
    .array(
      z.object({
        lineId: z.string(),
        snapshotId: z.string(),
        fingerprint: z.string(),
        state: z.string(),
      }),
    )
    .safeParse(revision?.bindings);
  const warnings: string[] = [];
  const lines: CommercialQuoteLine[] = [];
  for (const [i, item] of items.entries()) {
    const lineKey =
      item.lineId ??
      q.items.find((r) => r.position === i)?.lineKey ??
      `legacy:${q.items.find((r) => r.position === i)?.id ?? i}`;
    const binding =
      revision?.quoteId === q.id && bindings.success
        ? bindings.data.find(
            (b) =>
              b.lineId === lineKey &&
              b.state === "VALID" &&
              b.fingerprint === lineFingerprint(item),
          )
        : undefined;
    const snapshot = binding
      ? await tx.pricingSnapshot.findUnique({
          where: { id: binding.snapshotId },
        })
      : null;
    const data = pricingV2Schema.safeParse(snapshot?.input);
    const suggestion =
      data.success && snapshot
        ? {
            printerId: data.data.printer.ref.id,
            minutes: new Decimal(data.data.machineFixedMinutes)
              .plus(
                new Decimal(data.data.machineMinutesPerUnit).times(
                  item.quantity,
                ),
              )
              .toFixed(),
            snapshotId: snapshot.id,
            sourceQuantity: data.data.quantity,
          }
        : null;
    lines.push({
      lineKey,
      description: item.description,
      quantity: item.quantity,
      technology: data.success ? data.data.technology : null,
      suggestion,
    });
    if (!suggestion)
      warnings.push(
        `${item.description}: sem memória vigente; declare tecnologia e duração manualmente.`,
      );
  }
  if (!lines.length) warnings.push("Orçamento sem itens para simular.");
  return {
    opportunityVersion: o.version,
    quoteId: q.id,
    quoteVersion: q.version,
    saleId: null,
    lines,
    warnings,
    stage: o.stage,
    quoteStatus: q.status,
    validUntil: q.validUntil?.toISOString().slice(0, 10) ?? null,
    asOf,
  };
}
export async function getCommercialContext(actor: Actor, id: string) {
  return db.$transaction(
    async (tx) => {
      const asOf = new Date().toISOString(),
        context = await loadCommercialContext(tx, actor, id, asOf);
      const source = await loadPlanningSource(tx, actor, asOf);
      const rows = await tx.stockItem.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, active: true, inventoriedAt: true },
      });
      const materials = await Promise.all(
        rows.map(async (m) => ({
          ...m,
          inventoried: !!m.inventoriedAt,
          available: (await balance(tx, m.id)).available,
        })),
      );
      return { ...context, asOf, printers: source.printers, materials };
    },
    { isolationLevel: "RepeatableRead", timeout: 20000 },
  );
}
export type CommercialContext = Awaited<
  ReturnType<typeof getCommercialContext>
>;
export async function getSaleForecast(
  actor: Actor,
  id: string,
  raw: unknown = {},
) {
  const v = z
    .object({ completion: completionSchema.optional() })
    .strict()
    .parse(raw);
  return db.$transaction(
    async (tx) => {
      const asOf = new Date().toISOString(),
        source = await loadPlanningSource(tx, actor, asOf);
      const sale = await tx.sale.findUnique({
        where: { id },
        select: { id: true, version: true, expectedDeliveryDate: true },
      });
      if (!sale) throw new AppError("NOT_FOUND", "Venda não encontrada.");
      const facts = await loadSaleDemand(tx, id),
        projection = forecast(source.input);
      const demand = projectSaleDemand(facts, source.all, projection);
      const ready =
        demand.completeCoverage &&
        demand.lines.every((l) => l.planned === 0) &&
        !demand.allDelivered;
      const completion = demand.allDelivered
        ? {
            removalAt: null,
            releaseAt: null,
            deliveryAt: null,
            issues: [
              "Pedido integralmente entregue; consulte os registros realizados.",
            ],
          }
        : projectCompletion(
            demand.removalAt,
            ready,
            v.completion ?? unknownCompletion,
            asOf,
          );
      return envelope(
        asOf,
        source.input.revision,
        "sale",
        id,
        sale.version,
        { facts, input: source.input, completion: v.completion },
        {
          demand,
          completion,
          agreedDate:
            sale.expectedDeliveryDate?.toISOString().slice(0, 10) ?? null,
        },
      );
    },
    { isolationLevel: "RepeatableRead", timeout: 20000 },
  );
}
