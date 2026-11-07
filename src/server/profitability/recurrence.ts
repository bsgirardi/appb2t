import { z } from "zod";
import { db } from "@/lib/db";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { calculateSale } from "@/domain/profitability/calculate";
import {
  buildRecurrence,
  type RecurrenceCandidate,
  type RecurrenceReport,
} from "@/domain/profitability/recurrence";
import { pricingV2Schema } from "@/domain/pricing/validation";
import { lineFingerprint } from "@/domain/pricing/document-costs";
import { StockDecimal as D } from "@/domain/stock/quantities";
import type { Actor } from "@/server/auth/session";
import { requireProfitabilityAdmin } from "./authorization";
import { readSaleSources } from "./sources";

export async function getProductiveRecurrence(
  actor: Actor,
  productId?: string,
): Promise<RecurrenceReport> {
  await requireProfitabilityAdmin(actor);
  const product = z.string().min(1).max(100).optional().parse(productId);
  const to = todaySaoPaulo(new Date());
  const start = new Date(`${to}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 89);
  const period = { from: start.toISOString().slice(0, 10), to };
  return db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      // Entire window first: a product filter must not conceal shared production.
      const sales = await tx.sale.findMany({
        where: { status: { not: "RASCUNHO" } },
        select: {
          id: true,
          costRevisionId: true,
          events: {
            where: { action: { in: ["CONFIRM", "CONVERT"] } },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: 1,
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      const ids = sales
        .filter((s) => {
          const instant = s.events[0]?.createdAt;
          if (!instant) return false;
          const civil = todaySaoPaulo(instant);
          return civil >= period.from && civil <= period.to;
        })
        .map((s) => s.id);
      const candidates: RecurrenceCandidate[] = [];
      const currentRevisions = new Map(
        sales.map((s) => [s.id, s.costRevisionId]),
      );
      for (let offset = 0; offset < ids.length; offset += 50) {
        const batch = ids.slice(offset, offset + 50);
        const revisions = await tx.documentCostRevision.findMany({
          where: { saleId: { in: batch }, frozenAt: { not: null } },
          select: { id: true, saleId: true, bindings: true },
        });
        const snapshotIds = [
          ...new Set(
            revisions.flatMap((r) =>
              Array.isArray(r.bindings)
                ? r.bindings.flatMap((b) =>
                    b &&
                    typeof b === "object" &&
                    "snapshotId" in b &&
                    typeof b.snapshotId === "string"
                      ? [b.snapshotId]
                      : [],
                  )
                : [],
            ),
          ),
        ];
        const snapshots = await tx.pricingSnapshot.findMany({
          where: { id: { in: snapshotIds } },
          select: { id: true, input: true },
        });
        const configurations = new Map(
          snapshots.map((s) => {
            const parsed = pricingV2Schema.safeParse(s.input);
            return [s.id, parsed.success ? parsed.data : null] as const;
          }),
        );
        // An unreadable legacy input must not prevent reading its known actual costs.
        // Default source readers/hashes are unchanged; E2.4 cannot use these memories.
        const unavailableSnapshotIds = new Set(
          [...configurations].flatMap(([id, c]) => (c ? [] : [id])),
        );
        const inputs = await readSaleSources(tx, batch, {
          unavailableSnapshotIds,
        });
        const commitments = await tx.finishedCommitment.findMany({
          where: { saleId: { in: batch } },
          select: {
            saleId: true,
            lineKey: true,
            origin: { select: { lineId: true } },
            deliveryLines: { select: { id: true, sourceLineId: true } },
          },
        });
        const consignment = await tx.consignmentSaleLine.findMany({
          where: { consignmentSale: { saleId: { in: batch } } },
          select: {
            id: true,
            consignmentSale: { select: { saleId: true } },
            allocations: {
              select: {
                id: true,
                shipmentAllocation: {
                  select: { origin: { select: { lineId: true } } },
                },
              },
            },
          },
        });
        const production = await tx.productionLine.findMany({
          where: { order: { saleId: { in: batch } } },
          select: {
            id: true,
            saleLineKey: true,
            order: { select: { saleId: true } },
          },
        });
        const deliveries = new Map<string, string | null>();
        const consignmentSources = new Map<string, string | null>();
        const losses = new Map(production.map((l) => [l.id, l]));
        const related = new Map<string, Set<string>>();
        const relate = (
          saleId: string,
          lineKey: string,
          productionKey: string | null,
        ) => {
          if (!productionKey) return;
          const key = JSON.stringify([saleId, lineKey]);
          let keys = related.get(key);
          if (!keys) {
            keys = new Set();
            related.set(key, keys);
          }
          keys.add(productionKey);
        };
        for (const c of commitments)
          for (const d of c.deliveryLines)
            if (!d.sourceLineId) {
              deliveries.set(d.id, c.origin.lineId);
              relate(c.saleId, c.lineKey, c.origin.lineId);
            }
        for (const c of consignment)
          for (const a of c.allocations) {
            const key = a.shipmentAllocation.origin.lineId;
            consignmentSources.set(a.id, key);
            if (c.consignmentSale.saleId)
              relate(c.consignmentSale.saleId, c.id, key);
          }
        for (const input of inputs) {
          const sale = calculateSale(input);
          for (const line of sale.lines) {
            const keys = new Set(
              related.get(JSON.stringify([sale.saleId, line.key])) ?? [],
            );
            let complete = line.actual.sources.length > 0;
            for (const source of line.actual.sources) {
              let key: string | null | undefined;
              if (source.kind === "DELIVERED") key = deliveries.get(source.id);
              if (source.kind === "CONSIGNMENT_SOLD")
                key = consignmentSources.get(source.id);
              if (source.kind === "LOSS") {
                const loss = losses.get(source.id);
                if (
                  loss?.order.saleId === sale.saleId &&
                  loss.saleLineKey === line.key
                )
                  key = loss.id;
              }
              if (key) keys.add(key);
              else complete = false;
            }
            candidates.push({
              sale,
              line,
              configuration: line.expected
                ? (configurations.get(line.expected.snapshotId) ?? null)
                : null,
              productionKeys: [...keys].sort(),
              provenanceComplete: complete,
              memoryIssue: (() => {
                if (line.expected) return undefined;
                const revision = revisions.find(
                  (r) =>
                    r.id === currentRevisions.get(sale.saleId) &&
                    r.saleId === sale.saleId,
                );
                const raw =
                  revision && Array.isArray(revision.bindings)
                    ? revision.bindings.find(
                        (b) =>
                          b &&
                          typeof b === "object" &&
                          "lineId" in b &&
                          b.lineId === line.key,
                      )
                    : null;
                if (!raw) return "Memória prevista não vinculada";
                const parsed = z
                  .object({
                    snapshotId: z.string(),
                    fingerprint: z.string(),
                    state: z.enum(["VALID", "STALE"]),
                  })
                  .safeParse(raw);
                if (!parsed.success) return "Vínculo da memória ilegível";
                const binding = parsed.data;
                const fingerprint = lineFingerprint({
                  description: line.description,
                  quantity: line.quantity,
                  productId: line.productId ?? undefined,
                  unitPrice: new D(line.grossRevenue)
                    .div(line.quantity)
                    .toFixed(2),
                });
                if (
                  binding.state === "STALE" ||
                  binding.fingerprint !== fingerprint
                )
                  return "Vínculo da memória desatualizado";
                if (unavailableSnapshotIds.has(binding.snapshotId))
                  return "Entrada da memória congelada ilegível";
                return "Memória prevista indisponível ou quantidade incompatível";
              })(),
            });
          }
        }
      }
      const report = buildRecurrence(candidates, period);
      if (!product) return report;
      return {
        ...report,
        groups: report.groups.filter((g) => g.productId === product),
        ungrouped: report.ungrouped.filter((e) =>
          candidates.some(
            (c) =>
              c.sale.saleId === e.saleId &&
              c.line.key === e.lineKey &&
              (product === "__none__"
                ? !c.line.productId
                : c.line.productId === product),
          ),
        ),
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
