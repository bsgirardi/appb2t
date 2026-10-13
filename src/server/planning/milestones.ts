import type { Actor } from "@/server/auth/session";
import type { BatchDTO } from "@/domain/planning/types";
import type { Prisma, PlanningBatchState } from "@prisma/client";
import { z } from "zod";
import { planningMeta } from "@/domain/planning/validation";
import { stockQuantity } from "@/domain/stock/validation";
import { conflict } from "@/lib/errors";
import { invalid } from "@/server/stock/movements";
import { batchDTO, batchRow } from "./batch-read";
import { admin, runPlanningCommand } from "./commands";
import { batchAction } from "./batches";
import {
  durationMs,
  expandCalendar,
  findContinuousSlot,
} from "@/domain/planning/calendar";
import type { CalendarDTO } from "@/domain/planning/types";
const instant = z.iso.datetime({ offset: true });
const marker = z
  .object({
    ...planningMeta,
    batchId: z.string(),
    kind: z.enum([
      "PREPARE_START",
      "PRINT_START",
      "PRINT_END",
      "REMOVE_START",
      "REMOVE_END",
      "INTERRUPT",
      "REMAINING",
    ]),
    instant,
    remainingMinutes: stockQuantity.optional(),
  })
  .strict();
export type MilestoneInput = z.infer<typeof marker>;
function effective<T extends { id: string; sourceId: string | null }>(
  events: T[],
) {
  const replaced = new Set(
    events.flatMap((e) => (e.sourceId ? [e.sourceId] : [])),
  );
  return events.filter((e) => !replaced.has(e.id));
}
async function assertOccupancy(tx: Prisma.TransactionClient) {
  const rows = await tx.planningBatch.findMany({
    where: { milestones: { some: {} } },
    include: { milestones: true },
  });
  const machines: { id: string; start: number; end: number }[] = [],
    team: { id: string; start: number; end: number }[] = [];
  for (const b of rows) {
    const events = effective(b.milestones),
      at = (kind: string) =>
        events.find((m) => m.kind === kind)?.instant.getTime();
    const start = at("PREPARE_START"),
      print = at("PRINT_START"),
      end = at("PRINT_END") ?? at("INTERRUPT"),
      remove = at("REMOVE_START"),
      done = at("REMOVE_END");
    const ordered = [start, print, end, remove, done].filter(
      (x): x is number => x !== undefined,
    );
    if (ordered.some((x, i) => i > 0 && x < ordered[i - 1]))
      invalid("Os marcos devem respeitar a sequência temporal.");
    if (start !== undefined) {
      machines.push({ id: b.printerId, start, end: done ?? Infinity });
      team.push({ id: b.id, start, end: print ?? Infinity });
    }
    if (remove !== undefined)
      team.push({ id: b.id, start: remove, end: done ?? Infinity });
  }
  const overlaps = (
    a: { start: number; end: number },
    b: { start: number; end: number },
  ) => a.start < b.end && b.start < a.end;
  if (
    machines.some((a, i) =>
      machines.slice(i + 1).some((b) => a.id === b.id && overlaps(a, b)),
    ) ||
    team.some((a, i) => team.slice(i + 1).some((b) => overlaps(a, b)))
  )
    invalid("Horário conflita com outra ocupação de máquina ou da equipe.");
}
async function checkStartCalendar(
  tx: Prisma.TransactionClient,
  b: BatchDTO,
  at: string,
  remove = false,
) {
  const rows = await tx.planningCalendar.findMany({
    where: { id: { in: ["TEAM", `PRINTER:${b.printerId}`] } },
  });
  const end = new Date(Date.parse(at) + 90 * 86400000).toISOString();
  for (const id of ["TEAM", `PRINTER:${b.printerId}`]) {
    const row = rows.find((r) => r.id === id);
    if (!row) invalid("Configure os horários antes de iniciar.");
    const calendar = {
      id: row!.id,
      version: row!.version,
      weekly: row!.weekly,
      exceptions: row!.exceptions,
    } as unknown as CalendarDTO;
    const minutes = remove
      ? b.removeMinutes
      : id === "TEAM"
        ? b.prepareMinutes
        : String(Number(b.prepareMinutes) + Number(b.durationMinutes));
    const slot = findContinuousSlot(
      expandCalendar(calendar, at, end),
      at,
      minutes,
    );
    if (!slot || Date.parse(slot.start) !== Date.parse(at))
      invalid(
        "Início fora da disponibilidade; revise o calendário antes de iniciar.",
      );
  }
}
export async function recordMilestone(
  actor: Actor,
  raw: unknown,
): Promise<BatchDTO> {
  const v = marker.parse(raw);
  return runPlanningCommand(actor, "MILESTONE", v, async (tx) => {
    const b = await batchDTO(tx, v.batchId);
    if (b.version !== v.expectedVersion) throw conflict();
    const time = new Date(v.instant);
    if (time.getTime() > Date.now())
      invalid("Marco efetivo não pode ser futuro.");
    if (b.milestones.some((m) => Date.parse(m.instant) > time.getTime()))
      invalid(
        "Marco anterior ao último registro; use correção administrativa.",
      );
    const last = effective(b.milestones);
    let state: PlanningBatchState = b.state;
    switch (v.kind) {
      case "PREPARE_START": {
        if (b.state !== "SCHEDULED")
          invalid("Programe o lote antes de iniciar.");
        if (b.blockers.length) invalid(b.blockers.join(". "));
        const first = await tx.planningBatch.findFirst({
          where: { printerId: b.printerId, state: "SCHEDULED" },
          orderBy: [{ position: "asc" }, { id: "asc" }],
        });
        if (first?.id !== b.id)
          invalid("Inicie o primeiro lote ou ajuste a sequência.");
        await checkStartCalendar(tx, b, v.instant);
        state = "PREPARING";
        break;
      }
      case "PRINT_START":
        if (b.state !== "PREPARING") invalid("Registre a preparação primeiro.");
        state = "PRINTING";
        break;
      case "PRINT_END":
      case "INTERRUPT":
        if (b.state !== "PRINTING") invalid("Não há impressão em andamento.");
        if (v.kind === "INTERRUPT" && !v.reason)
          invalid("Informe o motivo da interrupção.");
        state = "AWAITING_REMOVAL";
        break;
      case "REMOVE_START":
        if (
          b.state !== "AWAITING_REMOVAL" ||
          last.some((m) => m.kind === "REMOVE_START")
        )
          invalid("Retirada indisponível.");
        await checkStartCalendar(tx, b, v.instant, true);
        break;
      case "REMOVE_END":
        if (
          b.state !== "AWAITING_REMOVAL" ||
          !last.some((m) => m.kind === "REMOVE_START")
        )
          invalid("Inicie a retirada primeiro.");
        state = "CLOSED";
        break;
      case "REMAINING":
        if (
          b.state !== "PRINTING" ||
          v.remainingMinutes === undefined ||
          durationMs(v.remainingMinutes) <= 0
        )
          invalid("Informe o tempo restante positivo da impressão.");
        break;
    }
    await tx.planningMilestone.create({
      data: {
        batchId: b.id,
        kind: v.kind,
        instant: time,
        actorId: actor.id,
        reason: v.reason ?? "",
      },
    });
    await tx.planningBatch.update({
      where: { id: b.id },
      data: {
        state,
        version: { increment: 1 },
        ...(v.kind === "REMAINING"
          ? { remainingMinutes: v.remainingMinutes, remainingAsOf: time }
          : {}),
      },
    });
    await assertOccupancy(tx);
    return batchDTO(tx, b.id);
  });
}
const reorder = z
  .object({
    ...planningMeta,
    printerId: z.string(),
    batchIds: z.array(z.string()).max(10000),
  })
  .strict();
export async function reorderQueue(
  actor: Actor,
  raw: unknown,
): Promise<{ revision: number }> {
  const v = reorder.parse(raw);
  return runPlanningCommand(actor, "QUEUE_ORDER", v, async (tx) => {
    const rows = await tx.planningBatch.findMany({
      where: {
        printerId: v.printerId,
        state: { in: ["PENDING", "SCHEDULED"] },
      },
    });
    if (
      rows.length !== v.batchIds.length ||
      new Set(v.batchIds).size !== rows.length ||
      rows.some((r) => !v.batchIds.includes(r.id))
    )
      invalid("Informe toda a fila futura uma única vez.");
    for (const [position, id] of v.batchIds.entries())
      await tx.planningBatch.update({
        where: { id },
        data: { position: position + 1, version: { increment: 1 } },
      });
    return { revision: v.expectedRevision + 1 };
  });
}
export async function cancelBatch(
  actor: Actor,
  raw: unknown,
): Promise<BatchDTO> {
  const v = batchAction.extend({ reason: z.string().trim().min(3) }).parse(raw);
  return runPlanningCommand(actor, "BATCH_CANCEL", v, async (tx) => {
    const b = await batchRow(tx, v.batchId);
    if (b.version !== v.expectedVersion) throw conflict();
    if (!["DRAFT", "PENDING", "SCHEDULED"].includes(b.state)) {
      admin(actor);
      if (
        b.state !== "CLOSED" ||
        b.participants.some((p) => p.settledUnits !== p.units)
      )
        invalid("Retire as peças e concilie a execução antes de cancelar.");
    }
    await tx.planningBatch.update({
      where: { id: b.id },
      data: { state: "CANCELED", version: { increment: 1 } },
    });
    return batchDTO(tx, b.id);
  });
}
const correction = z
  .object({
    ...planningMeta,
    sourceId: z.string(),
    instant,
    reason: z.string().trim().min(3),
  })
  .strict();
export async function correctMilestone(
  actor: Actor,
  raw: unknown,
): Promise<BatchDTO> {
  admin(actor);
  const v = correction.parse(raw);
  return runPlanningCommand(actor, "MILESTONE_CORRECT", v, async (tx) => {
    const source = await tx.planningMilestone.findUniqueOrThrow({
        where: { id: v.sourceId },
      }),
      b = await batchRow(tx, source.batchId);
    if (
      b.version !== v.expectedVersion ||
      b.milestones.some((m) => m.sourceId === source.id)
    )
      throw conflict();
    if (new Date(v.instant).getTime() > Date.now())
      invalid("Correção efetiva não pode ser futura.");
    if (source.kind === "REMAINING")
      invalid("Atualize o tempo restante com um novo apontamento.");
    await tx.planningMilestone.create({
      data: {
        batchId: b.id,
        kind: source.kind,
        instant: v.instant,
        actorId: actor.id,
        reason: v.reason,
        sourceId: source.id,
      },
    });
    await assertOccupancy(tx);
    await tx.planningBatch.update({
      where: { id: b.id },
      data: { version: { increment: 1 } },
    });
    return batchDTO(tx, b.id);
  });
}
