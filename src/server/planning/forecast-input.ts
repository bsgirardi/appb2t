import type { Prisma } from "@prisma/client";
import type { Actor } from "@/server/auth/session";
import type { CalendarDTO, PlanningInput } from "@/domain/planning/types";
import { AppError } from "@/lib/errors";
import { batchDTO } from "./batch-read";
export async function authorizePlanning(tx: Prisma.TransactionClient, actor: Actor) {
  const user = await tx.user.findUnique({ where: { id: actor.id } });
  if (!user?.active || user.role !== actor.role || !["ADMIN", "OPERATOR"].includes(user.role))
    throw new AppError("FORBIDDEN", "Acesso não autorizado.");
}
export async function loadPlanningSource(tx: Prisma.TransactionClient, actor: Actor, asOf: string) {
  await authorizePlanning(tx, actor);
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
  const input: PlanningInput = {
    asOf, revision, team: calendars.find(c => c.id === "TEAM") ?? null,
    machines: printers.map(p => ({ id: p.id, calendar: calendars.find(c => c.id === `PRINTER:${p.id}`) ?? null, batches: all.filter(b => b.printerId === p.id) })),
  };
  return { input, all, calendars, printers };
}
export async function loadPlanningInput(tx: Prisma.TransactionClient, actor: Actor, asOf: string): Promise<PlanningInput> {
  return (await loadPlanningSource(tx, actor, asOf)).input;
}
