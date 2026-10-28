import type { Prisma } from "@prisma/client";
import { StockDecimal as D } from "@/domain/stock/quantities";
import { apportionProductionCost } from "@/domain/production/costs";
import { allocateCostComponents } from "@/domain/production/cost-allocation";
import { readProductionCost } from "@/server/production/cost-sources";
import { readOpeningCost } from "@/server/profitability/origin-values";
import { factsHash } from "@/server/profitability/commands";
export type ConsignmentLineCost = {
  lineId: string;
  total: string | null;
  knownTotal: string;
  components: Record<string, string> | null;
  provisional: boolean;
  delivered: number;
  missing: string[];
  sources: { id: string; label: string; kind: string; value: string | null }[];
  hash: string;
  commission: string;
};
export async function readConsignmentLossCosts(
  tx: Prisma.TransactionClient,
  filter: {
    partnerId?: string;
    productId?: string;
    from?: string;
    to?: string;
  } = {},
) {
  const losses = await tx.consignmentEventAllocation.findMany({
    where: {
      event: {
        kind: "LOSS",
        ...(filter.partnerId ? { partnerId: filter.partnerId } : {}),
        ...(filter.from || filter.to
          ? {
              effectiveDate: {
                ...(filter.from
                  ? { gte: new Date(filter.from + "T00:00:00Z") }
                  : {}),
                ...(filter.to
                  ? { lte: new Date(filter.to + "T00:00:00Z") }
                  : {}),
              },
            }
          : {}),
      },
      ...(filter.productId
        ? { shipmentAllocation: { line: { productId: filter.productId } } }
        : {}),
    },
    include: {
      event: { include: { corrections: { include: { allocations: true } } } },
      shipmentAllocation: { include: { origin: true, line: true } },
    },
    orderBy: { id: "asc" },
  });
  const result: {
    id: string;
    partnerId: string;
    productId: string;
    date: string;
    reason: string;
    units: number;
    value: string | null;
    depreciation: string | null;
    provisional: boolean;
  }[] = [];
  for (const loss of losses) {
    const units =
      loss.units -
      loss.event.corrections
        .flatMap((e) => e.allocations)
        .filter((a) => a.shipmentAllocationId === loss.shipmentAllocationId)
        .reduce((n, a) => n + a.units, 0);
    if (!units) continue;
    const origin = loss.shipmentAllocation.origin;
    let value: string | null = null,
      depreciation: string | null = null,
      provisional = false;
    if (origin.lineId) {
      const cost = await readProductionCost(tx, origin.lineId),
        origins = cost.result.origins ?? [],
        oi = origins.findIndex((o) => o.originId === origin.id),
        o = origins[oi];
      provisional = cost.result.provisional;
      const bi =
        o?.allocations.findIndex(
          (b) => b.kind === "CONSIGNMENT_LOSS" && b.id === loss.id,
        ) ?? -1;
      if (o && bi >= 0) {
        value = o.allocations[bi].value;
        if (cost.result.total !== null) {
          const oc = allocateCostComponents(
            cost.result.total,
            cost.result.components,
            origins.map((x, i) => ({
              key: x.originId,
              position: i,
              weight: String(x.units),
            })),
          )[oi];
          depreciation =
            allocateCostComponents(
              oc.total,
              oc.components,
              o.allocations.map((b, i) => ({
                key: `${b.kind}:${b.id}`,
                position: i,
                weight: String(b.units),
              })),
            )[bi].components.depreciation ?? null;
        }
      }
    } else
      value =
        (await readOpeningCost(tx, origin.id)).buckets.find(
          (b) => b.id === loss.id,
        )?.value ?? null;
    result.push({
      id: loss.id,
      partnerId: loss.event.partnerId,
      productId: loss.shipmentAllocation.line.productId,
      date: loss.event.effectiveDate.toISOString().slice(0, 10),
      reason: loss.event.reason,
      units,
      value,
      depreciation,
      provisional,
    });
  }
  return result;
}
export async function readConsignmentSaleCost(
  tx: Prisma.TransactionClient,
  saleId: string,
) {
  const sale = await tx.consignmentSale.findUnique({
    where: { saleId },
    include: {
      lines: {
        include: {
          allocations: {
            include: { shipmentAllocation: { include: { origin: true } } },
          },
        },
      },
    },
  });
  if (!sale) return null;
  const lines: ConsignmentLineCost[] = [];
  for (const l of sale.lines) {
    let total: string | null = "0",
      known = new D(0),
      components: Record<string, string> | null = {
        material: "0",
        energy: "0",
        maintenance: "0",
        labor: "0",
        depreciation: "0",
      },
      provisional = false;
    const sources: ConsignmentLineCost["sources"] = [],
      missing: string[] = [],
      hashes: unknown[] = [];
    if (sale.status !== "CONFIRMED") continue;
    for (const a of l.allocations) {
      const o = a.shipmentAllocation.origin;
      let value: string | null = null,
        partKnown = "0",
        comps: Record<string, string> | null = null;
      if (o.lineId) {
        const cost = await readProductionCost(tx, o.lineId);
        hashes.push(cost.factsHash);
        provisional ||= cost.result.provisional;
        const origins = cost.result.origins ?? [],
          index = origins.findIndex((x) => x.originId === o.id),
          origin = origins[index];
        if (origin) {
          const bi = origin.allocations.findIndex(
            (b) => b.kind === "CONSIGNMENT_SOLD" && b.id === a.id,
          );
          if (bi >= 0) {
            value = origin.allocations[bi].value;
            const originKnown = apportionProductionCost(
              cost.result.knownTotal,
              origins.map((x) => x.units),
            )[index];
            partKnown =
              apportionProductionCost(
                originKnown,
                origin.allocations.map((b) => b.units),
              )[bi] ?? "0";
            if (cost.result.total !== null) {
              const oc = allocateCostComponents(
                cost.result.total,
                cost.result.components,
                origins.map((x, i) => ({
                  key: x.originId,
                  position: i,
                  weight: String(x.units),
                })),
              )[index];
              comps = allocateCostComponents(
                oc.total,
                oc.components,
                origin.allocations.map((b, i) => ({
                  key: `${b.kind}:${b.id}`,
                  position: i,
                  weight: String(b.units),
                })),
              )[bi].components;
            }
          }
        }
      } else {
        const opening = await readOpeningCost(tx, o.id);
        hashes.push(opening.buckets);
        const b = opening.buckets.find(
          (b) => b.kind === "CONSIGNMENT_SOLD" && b.id === a.id,
        );
        value = b?.value ?? null;
        partKnown = value ?? "0";
      }
      sources.push({
        id: a.id,
        label: "Peças vendidas em consignação",
        kind: "CONSIGNMENT_SOLD",
        value,
      });
      total =
        total === null || value === null
          ? null
          : new D(total).plus(value).toFixed();
      known = known.plus(partKnown);
      if (!comps) components = null;
      else if (components)
        for (const [k, v] of Object.entries(comps))
          components[k] = new D(components[k] ?? 0).plus(v).toFixed();
      if (value === null) missing.push("Custo de origem não valorizado");
    }
    lines.push({
      lineId: l.id,
      total,
      knownTotal: known.toFixed(),
      components,
      provisional,
      delivered: l.quantity,
      missing,
      sources,
      hash: factsHash(hashes),
      commission: l.commission?.toFixed(2) ?? "0.00",
    });
  }
  return { lines };
}
