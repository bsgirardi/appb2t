import { db } from "@/lib/db";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { StockDecimal as D } from "@/domain/stock/quantities";
import { allocate } from "@/domain/profitability/allocation";
import { consignmentFilterSchema } from "./queries";
import { requireConsignmentActor } from "./authorization";
import { readConsignmentSaleCost, readConsignmentLossCosts } from "./costs";
import { readConsignmentReceiptSummary } from "./finance";
type ReportRow = {
  partnerId: string;
  partnerName: string;
  productId: string;
  productName: string;
  units: number;
  lostUnits: number;
  gross: string;
  commission: string;
  repayment: string;
  received: string;
  commissionPaid: string;
  knownCost: string;
  knownLossCost: string;
  cost: string | null;
  lossCost: string | null;
  depreciation: string | null;
  provisional: boolean;
};
const add = (a: string, b: string) => new D(a).plus(b).toFixed();
const nullableAdd = (a: string | null, b: string | null) =>
  a === null || b === null ? null : add(a, b);
export async function getConsignmentReport(actor: Actor, raw: unknown) {
  assertAdmin(actor);
  const f = consignmentFilterSchema.parse(raw);
  return db.$transaction(
    async (tx) => {
      await requireConsignmentActor(tx, actor, true);
      const sales = await tx.consignmentSale.findMany({
        where: {
          status: "CONFIRMED",
          ...(f.partnerId ? { partnerId: f.partnerId } : {}),
          ...(f.from || f.to
            ? {
                effectiveDate: {
                  ...(f.from ? { gte: new Date(f.from + "T00:00:00Z") } : {}),
                  ...(f.to ? { lte: new Date(f.to + "T00:00:00Z") } : {}),
                },
              }
            : {}),
        },
        include: {
          partner: { include: { customer: { select: { name: true } } } },
          lines: {
            orderBy: { id: "asc" },
            include: { product: { select: { name: true } } },
          },
        },
        orderBy: { id: "asc" },
      });
      const rows = new Map<string, ReportRow>();
      function get(
        partnerId: string,
        partnerName: string,
        productId: string,
        productName: string,
      ) {
        const key = partnerId + ":" + productId;
        let row = rows.get(key);
        if (!row) {
          row = {
            partnerId,
            partnerName,
            productId,
            productName,
            units: 0,
            lostUnits: 0,
            gross: "0",
            commission: "0",
            repayment: "0",
            received: "0",
            commissionPaid: "0",
            knownCost: "0",
            knownLossCost: "0",
            cost: "0",
            lossCost: "0",
            depreciation: "0",
            provisional: false,
          };
          rows.set(key, row);
        }
        return row;
      }
      for (const sale of sales) {
        const costs = await readConsignmentSaleCost(tx, sale.saleId!),
          finance = await readConsignmentReceiptSummary(tx, sale.saleId!);
        const weights = (kind: "repayment" | "commission") =>
          sale.lines.map((l, i) => ({
            key: l.id,
            position: i,
            weight:
              kind === "commission"
                ? l.commission!.toFixed()
                : sale.model === "RETIDA"
                  ? l.gross!.minus(l.commission!).toFixed()
                  : l.gross!.toFixed(),
          }));
        const received = allocate(
            finance?.receivedRepayment ?? "0",
            weights("repayment"),
            2,
          ),
          paid = allocate(
            finance?.commissionPaid ?? "0",
            weights("commission"),
            2,
          );
        for (const [i, l] of sale.lines.entries()) {
          if (f.productId && l.productId !== f.productId) continue;
          const r = get(
              sale.partnerId,
              sale.partner.customer.name,
              l.productId,
              l.product.name,
            ),
            c = costs?.lines.find((c) => c.lineId === l.id);
          r.units += l.quantity;
          r.gross = add(r.gross, l.gross!.toFixed());
          r.commission = add(r.commission, l.commission!.toFixed());
          r.repayment = add(
            r.repayment,
            sale.model === "RETIDA"
              ? l.gross!.minus(l.commission!).toFixed()
              : l.gross!.toFixed(),
          );
          r.received = add(r.received, received[i].value);
          r.commissionPaid = add(r.commissionPaid, paid[i].value);
          r.knownCost = add(r.knownCost, c?.knownTotal ?? "0");
          r.cost = nullableAdd(r.cost, c?.total ?? null);
          r.depreciation = nullableAdd(
            r.depreciation,
            c?.components?.depreciation ?? null,
          );
          r.provisional ||= c?.provisional ?? true;
        }
      }
      for (const loss of await readConsignmentLossCosts(tx, f)) {
        const [partner, product] = await Promise.all([
          tx.partner.findUniqueOrThrow({
            where: { id: loss.partnerId },
            include: { customer: { select: { name: true } } },
          }),
          tx.product.findUniqueOrThrow({
            where: { id: loss.productId },
            select: { name: true },
          }),
        ]);
        const r = get(
          loss.partnerId,
          partner.customer.name,
          loss.productId,
          product.name,
        );
        r.lostUnits += loss.units;
        r.knownLossCost = add(r.knownLossCost, loss.value ?? "0");
        r.lossCost = nullableAdd(r.lossCost, loss.value);
        r.depreciation = nullableAdd(r.depreciation, loss.depreciation);
        r.provisional ||= loss.provisional;
      }
      const all = [...rows.values()]
        .map((r) => {
          const afterDepreciation =
            r.cost === null || r.lossCost === null
              ? null
              : new D(r.gross)
                  .minus(r.commission)
                  .minus(r.cost)
                  .minus(r.lossCost)
                  .toFixed();
          const contribution =
            afterDepreciation === null || r.depreciation === null
              ? null
              : new D(afterDepreciation).plus(r.depreciation).toFixed();
          return {
            ...r,
            afterDepreciation,
            contribution,
            coverage:
              afterDepreciation === null || contribution === null
                ? "PARTIAL"
                : r.provisional
                  ? "PROVISIONAL"
                  : "COMPLETE",
          };
        })
        .filter(
          (r) =>
            !f.query ||
            (r.partnerName + " " + r.productName)
              .toLocaleLowerCase()
              .includes(f.query.toLocaleLowerCase()),
        );
      const totals = {
        gross: "0",
        commission: "0",
        repayment: "0",
        received: "0",
        commissionPaid: "0",
        knownCost: "0",
        knownLossCost: "0",
      };
      for (const r of all)
        for (const k of Object.keys(totals) as (keyof typeof totals)[])
          totals[k] = add(totals[k], r[k]);
      return {
        items: all.slice((f.page - 1) * f.pageSize, f.page * f.pageSize),
        total: all.length,
        page: f.page,
        pageSize: f.pageSize,
        totals,
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
export type ConsignmentReportDTO = Awaited<
  ReturnType<typeof getConsignmentReport>
>;
