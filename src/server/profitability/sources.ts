import type { Prisma } from "@prisma/client";
import { StockDecimal as D } from "@/domain/stock/quantities";
import { AppError } from "@/lib/errors";
import type { DocumentTotals } from "@/domain/commerce/types";
import type {
  LineCostBinding,
  PricingV2Input,
  PricingV2Result,
} from "@/domain/pricing/types";
import { lineFingerprint } from "@/domain/pricing/document-costs";
import type {
  ExpectedCost,
  SaleProfitabilityInput,
  ProfitabilityLineInput,
} from "@/domain/profitability/types";
import { allocateCostComponents } from "@/domain/production/cost-allocation";
import { apportionProductionCost } from "@/domain/production/costs";
import { readProductionCost } from "@/server/production/cost-sources";
import { getSaleReceiptSummary } from "@/server/finance/entries";
import { factsHash } from "./commands";
import { revisionDTO } from "./revisions";
import { readConsignmentSaleCost } from "@/server/consignment/costs";
import { readOpeningCost } from "./origin-values";
const add = (a: string, b: string) => new D(a).plus(b).toFixed();
export async function readSaleSources(
  tx: Prisma.TransactionClient,
  saleIds: string[],
): Promise<SaleProfitabilityInput[]> {
  const sales = await tx.sale.findMany({
    where: { id: { in: saleIds } },
    include: {
      items: { orderBy: { position: "asc" } },
      events: {
        where: { action: { in: ["CONFIRM", "CONVERT"] } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
      profitabilityState: { include: { currentRevision: true } },
      finishedCommitments: {
        include: { origin: true, deliveryLines: true, events: true },
      },
      productionOrders: { include: { lines: true } },
    },
  });
  const revisionIds = sales.flatMap((s) =>
    s.costRevisionId ? [s.costRevisionId] : [],
  );
  const revisions = await tx.documentCostRevision.findMany({
    where: { id: { in: revisionIds } },
  });
  const bindings = revisions.flatMap(
    (r) => r.bindings as unknown as LineCostBinding[],
  );
  const snapshots = await tx.pricingSnapshot.findMany({
    where: { id: { in: [...new Set(bindings.map((b) => b.snapshotId))] } },
  });
  const productionIds = [
    ...new Set(
      sales.flatMap((s) => [
        ...s.finishedCommitments.flatMap((c) =>
          c.origin.lineId ? [c.origin.lineId] : [],
        ),
        ...s.productionOrders.flatMap((o) => o.lines.map((l) => l.id)),
      ]),
    ),
  ];
  const costs = new Map<
    string,
    Awaited<ReturnType<typeof readProductionCost>>
  >();
  for (const id of productionIds)
    costs.set(id, await readProductionCost(tx, id));
  const openings = new Map<
    string,
    Awaited<ReturnType<typeof readOpeningCost>>
  >();
  for (const id of [
    ...new Set(
      sales.flatMap((s) =>
        s.finishedCommitments
          .filter((c) => !c.origin.lineId)
          .map((c) => c.originId),
      ),
    ),
  ])
    openings.set(id, await readOpeningCost(tx, id));
  const readAt = new Date().toISOString();
  const output: SaleProfitabilityInput[] = [];
  for (const sale of sales) {
    const consignmentCost =
      sale.fulfillmentMode === "CONSIGNMENT"
        ? await readConsignmentSaleCost(tx, sale.id)
        : null;
    const commercial = revisions.find(
      (r) => r.id === sale.costRevisionId && r.saleId === sale.id && r.frozenAt,
    );
    const administrative = sale.profitabilityState?.currentRevision;
    const lines: ProfitabilityLineInput[] = [];
    for (const item of sale.items) {
      const key = item.lineKey ?? `legacy:${item.id}`;
      const binding = (
        commercial?.bindings as unknown as LineCostBinding[] | undefined
      )?.find(
        (b) =>
          b.lineId === key &&
          b.state === "VALID" &&
          b.fingerprint ===
            lineFingerprint({
              description: item.description,
              quantity: item.quantity,
              productId: item.productId ?? undefined,
              unitPrice: item.unitPrice.toFixed(2),
            }),
      );
      const snap = snapshots.find((s) => s.id === binding?.snapshotId);
      let expected: ExpectedCost | null = null;
      if (snap) {
        const input = snap.input as unknown as PricingV2Input,
          r = snap.result as unknown as PricingV2Result;
        if (input.version === 2 && input.quantity === item.quantity) {
          expected = {
            snapshotId: snap.id,
            variable: new D(r.variableCost).minus(r.commercialFixed).toFixed(),
            depreciation: r.depreciation,
            fixedFees: r.commercialFixed,
            feePercent: input.channel.fees
              .reduce((n, f) => n.plus(f.percent), new D(0))
              .toFixed(),
            extras: input.extras.map((e, i) => ({
              key: `${snap.id}:${i}`,
              name: e.name,
              value: new D(e.quantity)
                .times(e.unitCost)
                .times(e.basis === "UNIT" ? input.quantity : 1)
                .toFixed(),
            })),
            suggestedRevenue: r.offeredRevenue,
          };
        }
      }
      const actual: ProfitabilityLineInput["actual"] = {
        total: "0",
        knownTotal: "0",
        components: {
          material: "0",
          energy: "0",
          maintenance: "0",
          labor: "0",
          depreciation: "0",
        },
        reservedTotal: "0",
        delivered: 0,
        provisional: false,
        missing: [],
        sources: [],
      };
      const hashes: unknown[] = [];
      const addPart = (
        id: string,
        value: string | null,
        known: string,
        components: Record<string, string> | null,
        provisional: boolean,
        kind: string,
      ) => {
        actual.sources.push({
          id,
          label:
            kind === "LOSS" ? "Perda produtiva vinculada" : "Peças entregues",
          value,
          kind,
        });
        actual.knownTotal = add(actual.knownTotal, known);
        actual.total =
          actual.total === null || value === null
            ? null
            : add(actual.total, value);
        actual.provisional ||= provisional;
        if (value === null)
          actual.missing.push("Custo de origem não valorizado");
        if (!components) actual.components = null;
        else if (actual.components)
          for (const [k, v] of Object.entries(components))
            actual.components[k] = add(actual.components[k] ?? "0", v);
      };
      for (const c of sale.finishedCommitments.filter(
        (c) => c.lineKey === key,
      )) {
        const ids = new Set(
          c.deliveryLines.filter((d) => !d.sourceLineId).map((d) => d.id),
        );
        actual.delivered += c.deliveryLines.reduce((n, d) => n + d.units, 0);
        if (c.origin.lineId) {
          const cost = costs.get(c.origin.lineId)!,
            result = cost.result;
          hashes.push(cost.factsHash);
          const origins = result.origins ?? [],
            index = origins.findIndex((o) => o.originId === c.originId),
            origin = origins[index];
          if (!origin) {
            actual.total = null;
            actual.missing.push("Origem produtiva sem alocação");
            continue;
          }
          const weights = origins.map((o, i) => ({
            key: o.originId,
            position: i,
            weight: String(o.units),
          }));
          const originKnown =
            apportionProductionCost(
              result.knownTotal,
              origins.map((o) => o.units),
            )[index] ?? "0";
          const knownAlloc = apportionProductionCost(
            originKnown,
            origin.allocations.map((b) => b.units),
          );
          let comps: ReturnType<typeof allocateCostComponents> | null = null;
          if (result.total !== null && origin.units > 0) {
            const originComps = allocateCostComponents(
              result.total,
              result.components,
              weights,
            )[index];
            comps = allocateCostComponents(
              originComps.total,
              originComps.components,
              origin.allocations.map((b, i) => ({
                key: `${b.kind}:${b.id}`,
                position: i,
                weight: String(b.units),
              })),
            );
          }
          for (const [i, b] of origin.allocations.entries()) {
            if (b.kind === "DELIVERED" && ids.has(b.id))
              addPart(
                b.id,
                b.value,
                knownAlloc[i] ?? "0",
                comps?.[i].components ?? null,
                result.provisional,
                "DELIVERED",
              );
            if (b.kind === "RESERVED" && b.id === c.id)
              actual.reservedTotal =
                actual.reservedTotal === null || b.value === null
                  ? null
                  : add(actual.reservedTotal, b.value);
          }
        } else {
          const opening = openings.get(c.originId)!;
          hashes.push(opening);
          for (const b of opening.buckets) {
            if (b.kind === "DELIVERED" && ids.has(b.id))
              addPart(b.id, b.value, b.value ?? "0", null, false, "DELIVERED");
            if (b.kind === "RESERVED" && b.id === c.id)
              actual.reservedTotal =
                actual.reservedTotal === null || b.value === null
                  ? null
                  : add(actual.reservedTotal, b.value);
          }
        }
      }
      for (const order of sale.productionOrders)
        for (const l of order.lines.filter((l) => l.saleLineKey === key)) {
          const cost = costs.get(l.id)!;
          hashes.push(cost.factsHash);
          if (
            !["CONCLUIDA", "CANCELADA"].includes(order.status) &&
            order.status !== "RASCUNHO"
          )
            actual.provisional = true;
          const good = cost.facts.events.reduce((n, e) => n + e.goodUnits, 0);
          if (
            ["CONCLUIDA", "CANCELADA"].includes(order.status) &&
            good === 0 &&
            cost.facts.events.some((e) =>
              ["REPORT", "CORRECTION"].includes(e.kind),
            )
          )
            addPart(
              l.id,
              cost.result.total,
              cost.result.knownTotal,
              cost.result.total === null ? null : cost.result.components,
              cost.result.provisional,
              "LOSS",
            );
        }
      const cc = consignmentCost?.lines.find((l) => l.lineId === key);
      if (cc) {
        actual.total = cc.total;
        actual.knownTotal = cc.knownTotal;
        actual.components = cc.components;
        actual.provisional = cc.provisional;
        actual.delivered = cc.delivered;
        actual.missing = cc.missing;
        actual.sources = cc.sources;
        hashes.push(cc.hash);
      }
      if (!actual.sources.length) {
        actual.total = null;
        actual.components = null;
        actual.missing.push("Sem custo de entrega");
      }
      const sourceHash = factsHash({
        key,
        quantity: item.quantity,
        expected,
        actual,
        hashes,
      });
      lines.push({
        ...(cc ? { frozenCommission: cc.commission } : {}),
        key,
        position: item.position,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        grossRevenue: item.unitPrice.times(item.quantity).toFixed(2),
        expected,
        actual,
        sourceHash,
      });
    }
    const receipt = await getSaleReceiptSummary(tx, sale.id);
    const base = {
      consignment: sale.fulfillmentMode === "CONSIGNMENT",
      saleId: sale.id,
      number: String(sale.sequence),
      version: sale.version,
      status: sale.status,
      confirmedAt: sale.events[0]?.createdAt.toISOString() ?? null,
      totals: sale.totals as unknown as DocumentTotals,
      lines,
      administrative: administrative
        ? revisionDTO(administrative).payload
        : null,
      revision: administrative ? revisionDTO(administrative) : null,
      received: receipt.received,
      pending: receipt.pending,
    };
    output.push({ ...base, readAt, factsHash: factsHash(base) });
  }
  if (output.length !== new Set(saleIds).size)
    throw new AppError("NOT_FOUND", "Venda não encontrada.");
  return output;
}
