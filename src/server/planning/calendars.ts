import { z } from "zod";
import { calendarSchema, planningMeta } from "@/domain/planning/validation";
import { stockQuantity } from "@/domain/stock/validation";
import type { CalendarDTO } from "@/domain/planning/types";
import type { Actor } from "@/server/auth/session";
import { conflict } from "@/lib/errors";
import { invalid } from "@/server/stock/movements";
import { admin, runPlanningCommand } from "./commands";
export async function saveCalendar(
  actor: Actor,
  raw: unknown,
): Promise<CalendarDTO> {
  admin(actor);
  const v = calendarSchema.parse(raw);
  return runPlanningCommand(actor, "CALENDAR_SAVE", v, async (tx) => {
    const id = v.resource === "TEAM" ? "TEAM" : `PRINTER:${v.printerId}`;
    if (
      v.printerId &&
      !(await tx.printer.findFirst({
        where: { id: v.printerId, active: true },
      }))
    )
      invalid("Máquina indisponível.");
    const old = await tx.planningCalendar.findUnique({ where: { id } });
    if ((old?.version ?? 0) !== v.expectedVersion) throw conflict();
    const data = {
      resource: v.resource,
      printerId: v.printerId,
      weekly: v.weekly,
      exceptions: v.exceptions,
    };
    const row = await tx.planningCalendar.upsert({
      where: { id },
      create: { id, ...data },
      update: { ...data, version: { increment: 1 } },
    });
    return {
      id,
      version: row.version,
      weekly: v.weekly,
      exceptions: v.exceptions,
    };
  });
}
const settingsSchema = z
  .object({
    ...planningMeta,
    printerId: z.string().min(1),
    prepareMinutes: stockQuantity,
    removeMinutes: stockQuantity,
  })
  .strict();
export async function saveMachineSettings(
  actor: Actor,
  raw: unknown,
): Promise<{ version: number }> {
  admin(actor);
  const v = settingsSchema.parse(raw);
  return runPlanningCommand(actor, "MACHINE_SETTINGS", v, async (tx) => {
    if (
      !(await tx.printer.findFirst({
        where: { id: v.printerId, active: true },
      }))
    )
      invalid("Máquina indisponível.");
    const old = await tx.planningMachineSettings.findUnique({
      where: { printerId: v.printerId },
    });
    if ((old?.version ?? 0) !== v.expectedVersion) throw conflict();
    const data = {
      prepareMinutes: v.prepareMinutes,
      removeMinutes: v.removeMinutes,
    };
    const row = await tx.planningMachineSettings.upsert({
      where: { printerId: v.printerId },
      create: { printerId: v.printerId, ...data },
      update: { ...data, version: { increment: 1 } },
    });
    return { version: row.version };
  });
}
