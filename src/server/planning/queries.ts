import { z } from "zod";
import { db } from "@/lib/db";
import type { Actor } from "@/server/auth/session";
import { batchStateSchema } from "@/domain/planning/validation";
import { civilDateSchema } from "@/domain/commerce/validation";
import { forecast } from "@/domain/planning/scheduler";
import { suggestBatches } from "@/domain/planning/suggestions";
import { allocationRemaining } from "@/server/production/reservations";
import { batchDTO, unclaimed } from "./batch-read";
import { planningTimeSummary } from "./time-summary";
import { outstandingCoverage } from "./coverage";

import { authorizePlanning, loadPlanningSource } from "./forecast-input";
const filters = z
  .object({
    printerId: z.string().min(1).optional(),
    state: batchStateSchema.optional(),
    responsibleId: z.string().min(1).optional(),
    dueFrom: civilDateSchema.optional(),
    dueTo: civilDateSchema.optional(),
  })
  .strict();

export async function getPlanning(actor: Actor, raw: unknown = {}) {
  const f = filters.parse(raw);
  return db.$transaction(
    async (tx) => {
      const asOf = new Date().toISOString();
      const { input, all, calendars, printers } = await loadPlanningSource(tx, actor, asOf);
      const revision = input.revision;
      const projection = forecast(input);
      const lineRows = await tx.productionLine.findMany({
        where: { order: { status: { in: ["LIBERADA", "EM_EXECUCAO"] } } },
        include: { order: true },
        orderBy: { id: "asc" },
      });
      const lines = await Promise.all(
        lineRows.map(async (l) => ({
          id: l.id,
          orderId: l.orderId,
          orderSequence: l.order.sequence,
          description: l.description,
          printerId: l.plannedPrinterId,
          technology: l.technology,
          dueDate: l.order.dueDate?.toISOString().slice(0, 10) ?? null,
          responsibleId: l.order.responsibleId,
          freeUnits: await unclaimed(tx, l.id),
        })),
      );
      const materials = await tx.stockItem.findMany({
        select: {
          id: true,
          name: true,
          unit: true,
          active: true,
          inventoriedAt: true,
        },
        orderBy: { name: "asc" },
      });
      const allocationRows = await tx.productionReservationAllocation.findMany({
        where: { lineId: { in: lines.map((l) => l.id) } },
        include: {
          reservation: { select: { itemId: true } },
          planningCoverage: {
            include: {
              participation: {
                select: { batchId: true, batch: { select: { state: true } } },
              },
            },
          },
        },
      });
      const allocations = await Promise.all(
        allocationRows.map(async (a) => ({
          id: a.id,
          lineId: a.lineId,
          itemId: a.reservation.itemId,
          remaining: (await allocationRemaining(tx, a.id)).toFixed(),
          claimed: await outstandingCoverage(tx, a.id),
        })),
      );
      // Only explicit, unambiguous prior declarations qualify for suggestions.
      const candidates = lines.map((l) => {
        const known = all.filter(
          (b) =>
            b.state !== "CANCELED" &&
            b.participants.some((p) => p.lineId === l.id),
        );
        const keys = new Set(
          known.map((b) => JSON.stringify([b.materialItemId, b.colorKey])),
        );
        const reference = keys.size === 1 ? known[0] : undefined;
        return {
          lineId: l.id,
          printerId: l.printerId,
          technology: l.technology,
          materialItemId: reference?.materialItemId ?? null,
          colorKey: reference?.colorKey ?? null,
          dueDate: l.dueDate,
          units: l.freeUnits,
          orderSequence: l.orderSequence,
        };
      });
      const batches = all.filter(
        (b) =>
          (!f.printerId || b.printerId === f.printerId) &&
          (!f.state || b.state === f.state) &&
          b.participants.some(
            (p) =>
              (!f.responsibleId || p.responsibleId === f.responsibleId) &&
              (!f.dueFrom || (!!p.dueDate && p.dueDate >= f.dueFrom)) &&
              (!f.dueTo || (!!p.dueDate && p.dueDate <= f.dueTo)),
          ),
      );
      return {
        revision,
        asOf,
        role: actor.role,
        forecast: projection,
        batches,
        suggestions: suggestBatches(candidates),
        calendars,
        printers,
        lines,
        allocations,
        timeSummaries: await Promise.all(
          all
            .filter((b) => !["DRAFT", "PENDING", "SCHEDULED"].includes(b.state))
            .map(async (b) => ({
              batchId: b.id,
              ...(await planningTimeSummary(tx, b.id)),
            })),
        ),
        reports: (
          await tx.productionEvent.findMany({
            where: {
              kind: "REPORT",
              lineId: {
                in: all.flatMap((b) => b.participants.map((p) => p.lineId)),
              },
            },
            select: {
              id: true,
              sequence: true,
              lineId: true,
              printerId: true,
              goodUnits: true,
              failedUnits: true,
              effectiveDate: true,
              corrections: { select: { goodUnits: true, failedUnits: true } },
            },
            orderBy: { sequence: "desc" },
          })
        ).map((e) => ({
          id: e.id,
          sequence: e.sequence,
          lineId: e.lineId,
          printerId: e.printerId,
          goodUnits:
            e.goodUnits + e.corrections.reduce((n, c) => n + c.goodUnits, 0),
          failedUnits:
            e.failedUnits +
            e.corrections.reduce((n, c) => n + c.failedUnits, 0),
          date: e.effectiveDate.toISOString().slice(0, 10),
        })),
        materials: materials.map((m) => ({
          id: m.id,
          name: m.name,
          unit: m.unit,
          active: m.active,
          inventoried: !!m.inventoriedAt,
        })),
        users: await tx.user.findMany({
          where: { active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        warnings: [
          ...(!calendars.some((c) => c.id === "TEAM")
            ? ["Horários da equipe não configurados."]
            : []),
          ...printers
            .filter(
              (p) =>
                p.active && !calendars.some((c) => c.id === `PRINTER:${p.id}`),
            )
            .map((p) => `Horários de ${p.name} não configurados.`),
        ],
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 20000 },
  );
}
export async function getBatch(actor: Actor, id: string) {
  return db.$transaction(
    async (tx) => {
      await authorizePlanning(tx, actor);
      return batchDTO(tx, id);
    },
    { isolationLevel: "RepeatableRead" },
  );
}
