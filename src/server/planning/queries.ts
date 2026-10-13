import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import type { CalendarDTO } from "@/domain/planning/types";
import { batchStateSchema } from "@/domain/planning/validation";
import { civilDateSchema } from "@/domain/commerce/validation";
import { forecast } from "@/domain/planning/scheduler";
import { suggestBatches } from "@/domain/planning/suggestions";
import { allocationRemaining } from "@/server/production/reservations";
import { batchDTO, unclaimed } from "./batch-read";
import type { Prisma } from "@prisma/client";

async function authorize(tx: Prisma.TransactionClient, actor: Actor) {
  const user = await tx.user.findUnique({ where: { id: actor.id } });
  if (!user?.active || user.role !== actor.role)
    throw new AppError("FORBIDDEN", "Acesso não autorizado.");
}
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
      await authorize(tx, actor);
      const asOf = new Date().toISOString();
      const revision =
        (await tx.planningState.findUnique({ where: { id: 1 } }))?.revision ??
        0;
      const calendarRows = await tx.planningCalendar.findMany({
        orderBy: { id: "asc" },
      });
      const calendars: CalendarDTO[] = calendarRows.map((c) => ({
        id: c.id,
        version: c.version,
        weekly: c.weekly as CalendarDTO["weekly"],
        exceptions: c.exceptions as CalendarDTO["exceptions"],
      }));
      const printerRows = await tx.printer.findMany({
        select: {
          id: true,
          name: true,
          technology: true,
          active: true,
          planningSettings: true,
        },
        orderBy: { name: "asc" },
      });
      const printers = printerRows.map((p) => ({
        id: p.id,
        name: p.name,
        technology: p.technology,
        active: p.active,
        settings: p.planningSettings
          ? {
              version: p.planningSettings.version,
              prepareMinutes: p.planningSettings.prepareMinutes.toFixed(),
              removeMinutes: p.planningSettings.removeMinutes.toFixed(),
            }
          : null,
      }));
      const batchIds = await tx.planningBatch.findMany({
        select: { id: true },
        orderBy: [{ position: "asc" }, { id: "asc" }],
      });
      const all = await Promise.all(batchIds.map((b) => batchDTO(tx, b.id)));
      const projection = forecast({
        asOf,
        revision,
        team: calendars.find((c) => c.id === "TEAM") ?? null,
        machines: printers.map((p) => ({
          id: p.id,
          calendar: calendars.find((c) => c.id === `PRINTER:${p.id}`) ?? null,
          batches: all.filter((b) => b.printerId === p.id),
        })),
      });
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
          claimed: a.planningCoverage
            .filter(
              (c) =>
                !["DRAFT", "CANCELED", "CLOSED"].includes(
                  c.participation.batch.state,
                ),
            )
            .map((c) => ({
              batchId: c.participation.batchId,
              quantity: c.quantity.toFixed(),
            })),
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
      await authorize(tx, actor);
      return batchDTO(tx, id);
    },
    { isolationLevel: "RepeatableRead" },
  );
}
