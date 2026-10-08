import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { StockDecimal as D } from "@/domain/stock/quantities";
import {
  calculateProductionCost,
  type CostStage,
  type LineCostDTO,
} from "@/domain/production/costs";
import type { Actor } from "@/server/auth/session";
import { assertAdmin } from "@/server/auth/authorization";
import { readValuation } from "@/server/stock/valuation";
import { lineContext, lockOrder } from "./orders";
import { lockProduction } from "./locks";
import { canonical, requireProductionActor } from "./commands";
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
  const factsHash = createHash("sha256")
    .update(JSON.stringify(canonical({ events, closed: o.status, sources })))
    .digest("hex");
  const revision = await tx.productionCostRevision.upsert({
    where: { lineId_factsHash: { lineId, factsHash } },
    create: {
      lineId,
      factsHash,
      result: { ...result, sources } as Prisma.InputJsonValue,
    },
    update: {},
  });
  return { ...result, lineId: l.id, revisionId: revision.id };
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
