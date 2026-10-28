import { z } from "zod";
import { db } from "@/lib/db";
import { StockDecimal as D } from "@/domain/stock/quantities";
import { civilDateSchema } from "@/domain/commerce/validation";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { calculateSale } from "@/domain/profitability/calculate";
import { aggregateSales } from "@/domain/profitability/aggregate";
import type {
  ReportDTO,
  SaleProfitabilityDTO,
  Money,
} from "@/domain/profitability/types";
import type { Actor } from "@/server/auth/session";
import { readProductionCost } from "@/server/production/cost-sources";
import { readOpeningCost } from "./origin-values";
import { readSaleSources } from "./sources";
import { requireProfitabilityAdmin } from "./authorization";
import { readConsignmentLossCosts } from "@/server/consignment/costs";
export const reportFilterSchema = z
  .object({
    from: civilDateSchema.optional(),
    to: civilDateSchema.optional(),
    undated: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .transform((v) => v === true || v === "true")
      .default(false),
    situation: z.enum(["NORMAL", "EXCEPTIONS"]).default("NORMAL"),
    productId: z.string().min(1).max(100).optional(),
    channelId: z.string().min(1).max(100).optional(),
    coverage: z
      .enum(["UNAVAILABLE", "PARTIAL", "PROVISIONAL", "COMPLETE"])
      .optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.from && v.to && v.from > v.to)
      ctx.addIssue({
        code: "custom",
        message: "O início deve anteceder o fim do período.",
      });
  });
export function defaultPeriod() {
  const today = todaySaoPaulo(new Date());
  return { from: `${today.slice(0, 7)}-01`, to: today };
}
export async function getProfitabilityReport(
  actor: Actor,
  raw: unknown,
): Promise<ReportDTO> {
  await requireProfitabilityAdmin(actor);
  const f = reportFilterSchema.parse(raw),
    defaults = defaultPeriod();
  return db.$transaction(
    async (tx) => {
      const candidates = await tx.sale.findMany({
        where: {
          status: { not: "RASCUNHO" },
          ...(f.productId
            ? {
                items: {
                  some:
                    f.productId === "__none__"
                      ? { productId: null }
                      : { productId: f.productId },
                },
              }
            : {}),
        },
        select: {
          id: true,
          events: {
            where: { action: { in: ["CONFIRM", "CONVERT"] } },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: 1,
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      const ids = candidates
        .filter((s) => {
          const instant = s.events[0]?.createdAt;
          if (f.undated) return !instant;
          if (!instant) return false;
          const date = todaySaoPaulo(instant);
          return (
            date >= (f.from ?? defaults.from) && date <= (f.to ?? defaults.to)
          );
        })
        .map((s) => s.id);
      const rows: SaleProfitabilityDTO[] = [];
      for (let i = 0; i < ids.length; i += 50)
        rows.push(
          ...(await readSaleSources(tx, ids.slice(i, i + 50))).map(
            calculateSale,
          ),
        );
      rows.sort((a, b) => ids.indexOf(a.saleId) - ids.indexOf(b.saleId));
      const filtered = rows.filter(
        (r) =>
          (f.situation === "EXCEPTIONS" ? r.excluded : !r.excluded) &&
          (!f.channelId ||
            (r.administrative?.channel?.id ?? "__none__") === f.channelId) &&
          (!f.coverage || r.actual.contribution.coverage === f.coverage),
      );
      const result = aggregateSales(filtered);
      return {
        ...result,
        page: f.page,
        pageSize: f.pageSize,
        items: filtered.slice((f.page - 1) * f.pageSize, f.page * f.pageSize),
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
export async function getSaleProfitability(
  actor: Actor,
  saleId: string,
): Promise<SaleProfitabilityDTO> {
  await requireProfitabilityAdmin(actor);
  return db.$transaction(
    async (tx) => calculateSale((await readSaleSources(tx, [saleId]))[0]),
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
export async function listUnassignedLosses(
  actor: Actor,
  raw: unknown,
): Promise<{
  items: {
    sourceId: string;
    effectiveDate: string;
    value: Money | null;
    reason: string;
  }[];
  total: number;
}> {
  await requireProfitabilityAdmin(actor);
  const f = reportFilterSchema.parse(raw),
    period = defaultPeriod();
  return db.$transaction(
    async (tx) => {
      const items: {
        sourceId: string;
        effectiveDate: string;
        value: Money | null;
        reason: string;
      }[] = [];
      const movements = await tx.finishedMovement.findMany({
        where: { kind: { in: ["LOSS", "ADJUSTMENT_OUT"] } },
        include: { origin: true },
        orderBy: { id: "asc" },
      });
      const costs = new Map<
        string,
        Awaited<ReturnType<typeof readProductionCost>>
      >();
      for (const m of movements) {
        let value: string | null = null;
        if (m.origin.lineId) {
          let cost = costs.get(m.origin.lineId);
          if (!cost) {
            cost = await readProductionCost(tx, m.origin.lineId);
            costs.set(m.origin.lineId, cost);
          }
          const bucket = cost.result.origins
            ?.find((o) => o.originId === m.originId)
            ?.allocations.find(
              (b) =>
                b.kind === m.kind &&
                b.id === (m.kind === "LOSS" ? m.originId : m.id),
            );
          if (bucket?.value != null)
            value = new D(bucket.value)
              .times(-m.units)
              .div(bucket.units)
              .toDecimalPlaces(6)
              .toFixed();
        } else {
          value =
            (await readOpeningCost(tx, m.originId)).buckets.find(
              (b) => b.id === m.id,
            )?.value ?? null;
        }
        items.push({
          sourceId: m.id,
          effectiveDate: m.effectiveDate.toISOString().slice(0, 10),
          value,
          reason: m.reason || "Perda de peças sem atribuição comercial",
        });
      }
      const lines = await tx.productionLine.findMany({
        where: {
          order: { saleId: null, status: { in: ["CONCLUIDA", "CANCELADA"] } },
        },
      });
      for (const l of lines) {
        const c = costs.get(l.id) ?? (await readProductionCost(tx, l.id));
        if (c.facts.events.reduce((n, e) => n + e.goodUnits, 0) !== 0) continue;
        const reports = c.facts.events.filter(
          (e) => e.kind === "REPORT" || e.kind === "CORRECTION",
        );
        if (!reports.length) continue;
        items.push({
          sourceId: l.id,
          effectiveDate: reports
            .map((e) => e.effectiveDate.toISOString().slice(0, 10))
            .sort()
            .at(-1)!,
          value: c.result.total,
          reason: "Produção encerrada sem peças boas e sem venda vinculada",
        });
      }
      for (const loss of await readConsignmentLossCosts(tx, {
        from: f.from ?? period.from,
        to: f.to ?? period.to,
        productId: f.productId,
      }))
        items.push({
          sourceId: loss.id,
          effectiveDate: loss.date,
          value: loss.value,
          reason: `Perda em consignação: ${loss.reason}`,
        });
      const filtered = items.filter(
        (i) =>
          i.effectiveDate >= (f.from ?? period.from) &&
          i.effectiveDate <= (f.to ?? period.to),
      );
      return {
        items: filtered.slice((f.page - 1) * f.pageSize, f.page * f.pageSize),
        total: filtered.length,
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
