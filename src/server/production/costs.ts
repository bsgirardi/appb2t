import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { StockDecimal as D } from "@/domain/stock/quantities";
import {
  calculateProductionCost,
  apportionProductionCost,
  type CostStage,
  type LineCostDTO,
} from "@/domain/production/costs";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { readValuation } from "@/server/stock/valuation";
import { lineContext, lockOrder } from "./orders";
import { lockProduction } from "./locks";
import { canonical, requireProductionActor } from "./commands";
import { originBalance } from "./finished-stock";
import { commitmentRemaining } from "./fulfillment";
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const string = (v: unknown) =>
  typeof v === "number" || typeof v === "string" ? String(v) : null;
export async function ensureProductionCostRevision(
  tx: Prisma.TransactionClient,
  lineId: string,
): Promise<LineCostDTO> {
  const { order: o, line: l } = await lineContext(tx, lineId);
  const events = await tx.productionEvent.findMany({
    where: { lineId },
    include: { materialLinks: { include: { movement: true } } },
    orderBy: { sequence: "asc" },
  });
  const itemIds = [
    ...new Set(
      events.flatMap((e) => e.materialLinks.map((m) => m.movement.itemId)),
    ),
  ];
  await lockProduction(tx, { itemIds });
  const valuations = new Map<
    string,
    Awaited<ReturnType<typeof readValuation>>
  >();
  for (const id of itemIds) valuations.set(id, await readValuation(tx, id));
  const materials = [];
  for (const e of events)
    for (const link of e.materialLinks) {
      const rows = valuations
        .get(link.movement.itemId)!
        .allocations.filter((a) => a.targetId === link.movementId);
      const value =
        rows.length && rows.every((a) => a.value !== null)
          ? rows
              .reduce((s, a) => s.plus(a.value!), new D(0))
              .times(link.quantity.toString())
              .div(link.movement.quantity.abs().toString())
              .toDecimalPlaces(6)
              .toFixed()
          : null;
      materials.push({
        value,
        provisional: !rows.length || rows.some((a) => a.provisional),
      });
    }
  const reports = events.filter(
    (e) => e.kind === "REPORT" || e.kind === "CORRECTION",
  );
  const stages: CostStage[] = reports.map((e) => {
    const premise = object(e.premises),
      settings = object(object(premise.settings).values),
      p = object(premise.printer);
    return {
      machineMinutes: premise.manualStage
        ? "0"
        : (e.machineMinutes?.toFixed() ?? null),
      setupMinutes: e.setupMinutes?.toFixed() ?? null,
      finishingMinutes: e.finishingMinutes?.toFixed() ?? null,
      watts: string(p.watts),
      energyRate: string(settings.energyRate),
      maintenancePerHour: string(settings.maintenancePerHour),
      laborPerHour: string(settings.laborPerHour),
      acquisitionCost: string(p.acquisitionCost),
      amortizationMonths: string(p.amortizationMonths),
      daysPerMonth: string(p.daysPerMonth),
      hoursPerDay: string(p.hoursPerDay),
    };
  });
  const result = calculateProductionCost({
    goodUnits: events.reduce((n, e) => n + e.goodUnits, 0),
    closed: ["CONCLUIDA", "CANCELADA"].includes(o.status),
    materialComplete:
      reports.length > 0 && reports.every((e) => e.materialComplete),
    timeComplete: reports.length > 0 && reports.every((e) => e.timeComplete),
    materials,
    stages,
  });
  const sources = [...valuations.entries()].map(([itemId, result]) => ({
    itemId,
    result,
  }));
  const originRows = await tx.finishedOrigin.findMany({
    where: { lineId },
    include: { movements: true, commitments: true },
    orderBy: { sequence: "asc" },
  });
  const weights = originRows.map((origin) =>
    origin.movements
      .filter((m) => ["PRODUCTION", "CORRECTION"].includes(m.kind))
      .reduce((n, m) => n + m.units, 0),
  );
  const values = apportionProductionCost(result.total, weights);
  const origins = await Promise.all(
    originRows.map(async (origin, index) => {
      const state = await originBalance(tx, origin.id);
      const buckets: { kind: string; id: string; units: number }[] = [];
      const deliveryLines = await tx.productionDeliveryLine.findMany({
        where: { commitment: { originId: origin.id } },
        orderBy: { id: "asc" },
      });
      for (const line of deliveryLines.filter((d) => !d.sourceLineId)) {
        const units =
          line.units +
          deliveryLines
            .filter((d) => d.sourceLineId === line.id)
            .reduce((n, d) => n + d.units, 0);
        if (units) buckets.push({ kind: "DELIVERED", id: line.id, units });
      }
      for (const c of origin.commitments) {
        const units = await commitmentRemaining(tx, c.id);
        if (units) buckets.push({ kind: "RESERVED", id: c.id, units });
      }
      const lost = -origin.movements
        .filter((m) => m.kind === "LOSS")
        .reduce((n, m) => n + m.units, 0);
      if (lost) buckets.push({ kind: "LOSS", id: origin.id, units: lost });
      for (const movement of origin.movements.filter(
        (m) => m.kind === "ADJUSTMENT_OUT",
      ))
        buckets.push({
          kind: "ADJUSTMENT_OUT",
          id: movement.id,
          units: -movement.units,
        });
      if (Number(state.available))
        buckets.push({
          kind: "AVAILABLE",
          id: origin.id,
          units: Number(state.available),
        });
      const allocated = apportionProductionCost(
        values[index],
        buckets.map((b) => b.units),
      );
      return {
        originId: origin.id,
        units: weights[index],
        value: values[index],
        allocations: buckets.map((b, i) => ({ ...b, value: allocated[i] })),
      };
    }),
  );
  const factsHash = createHash("sha256")
    .update(
      JSON.stringify(canonical({ events, closed: o.status, sources, origins })),
    )
    .digest("hex");
  const revision = await tx.productionCostRevision.upsert({
    where: { lineId_factsHash: { lineId, factsHash } },
    create: {
      lineId,
      factsHash,
      result: { ...result, sources, origins } as Prisma.InputJsonValue,
    },
    update: {},
  });
  return { ...result, origins, lineId: l.id, revisionId: revision.id };
}
export async function refreshProductionCosts(
  actor: Actor,
  orderId: string,
): Promise<LineCostDTO[]> {
  assertAdmin(actor);
  await requireProductionActor(actor);
  return db.$transaction(
    async (tx) => {
      const o = await lockOrder(tx, orderId);
      const origins = await tx.finishedOrigin.findMany({
        where: { line: { orderId } },
        select: { stockId: true },
      });
      await lockProduction(tx, { finishedIds: origins.map((x) => x.stockId) });
      const links = await tx.productionMaterialLink.findMany({
        where: { event: { line: { orderId } } },
        include: { movement: true },
      });
      await lockProduction(tx, {
        itemIds: links.map((l) => l.movement.itemId),
      });
      const result = [];
      for (const l of o.lines)
        result.push(await ensureProductionCostRevision(tx, l.id));
      return result;
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
