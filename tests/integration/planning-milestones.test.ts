import { previewQueue } from "@/server/planning/queue-preview";
import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
import {
  planningFixture,
  planningMeta,
  scheduledBatch,
} from "../fixtures/planning";
import {
  recordMilestone,
  reorderQueue,
  cancelBatch,
  correctMilestone,
} from "@/server/planning/milestones";
import { saveCalendar } from "@/server/planning/calendars";
setupDatabase();
it("accepts an end after the corrected effective start, and justified real removal after hours", async () => {
  const f = await planningFixture();
  let b = await scheduledBatch(f);
  const day = "2026-10-10";
  const mark = async (kind: string, clock: string, reason?: string) => {
    b = await recordMilestone(f.actor, {
      ...(await planningMeta(b.version)),
      batchId: b.id,
      kind,
      instant: `${day}T${clock}:00-03:00`,
      reason,
    });
  };
  await mark("PREPARE_START", "08:55");
  await mark("PRINT_START", "10:00");
  b = await correctMilestone(f.actor, {
    ...(await planningMeta(b.version)),
    sourceId: b.milestones.find((m) => m.kind === "PRINT_START")!.id,
    instant: `${day}T09:00:00-03:00`,
    reason: "Horário anotado incorretamente",
  });
  await mark("PRINT_END", "09:30");
  const team = await db.planningCalendar.findUniqueOrThrow({
    where: { id: "TEAM" },
  });
  await saveCalendar(f.actor, {
    ...(await planningMeta(team.version)),
    resource: "TEAM",
    printerId: null,
    weekly: Array.from({ length: 7 }, (_, i) => ({
      weekday: i + 1,
      startMinute: 480,
      endMinute: 1080,
    })),
    exceptions: [],
  });
  await expect(mark("REMOVE_START", "18:05")).rejects.toThrow();
  await mark(
    "REMOVE_START",
    "18:05",
    "Retirada extraordinária após expediente",
  );
  await mark("REMOVE_END", "18:15", "Retirada extraordinária concluída");
  expect(b.state).toBe("CLOSED");
});
it("keeps machine occupied until removal and never posts production automatically", async () => {
  const f = await planningFixture();
  let a = await scheduledBatch(f);
  const b = await scheduledBatch(f);
  const initial = await db.productionEvent.count();
  const at = () => new Date().toISOString();
  a = await recordMilestone(f.actor, {
    ...(await planningMeta(a.version)),
    batchId: a.id,
    kind: "PREPARE_START",
    instant: at(),
  });
  await expect(
    recordMilestone(f.actor, {
      ...(await planningMeta(b.version)),
      batchId: b.id,
      kind: "PREPARE_START",
      instant: at(),
    }),
  ).rejects.toThrow();
  for (const kind of [
    "PRINT_START",
    "PRINT_END",
    "REMOVE_START",
    "REMOVE_END",
  ]) {
    a = await recordMilestone(f.actor, {
      ...(await planningMeta(a.version)),
      batchId: a.id,
      kind,
      instant: at(),
    });
  }
  expect(a.state).toBe("CLOSED");
  expect(a.participants[0].settledUnits).toBe(0);
  expect(await db.productionEvent.count()).toBe(initial);
  await expect(
    correctMilestone(f.actor, {
      ...(await planningMeta(a.version)),
      sourceId: a.milestones[0].id,
      instant: new Date(Date.now() + 3600000).toISOString(),
      reason: "Correção futura",
    }),
  ).rejects.toThrow();
});
it("reorders only a complete future queue and cancellation preserves stock reservations", async () => {
  const f = await planningFixture(),
    a = await scheduledBatch(f),
    b = await scheduledBatch(f);
  await expect(
    reorderQueue(f.actor, {
      ...(await planningMeta()),
      printerId: f.printer.id,
      batchIds: [a.id],
      previewAsOf: new Date().toISOString(), previewFingerprint: "0".repeat(64),
    }),
  ).rejects.toThrow();
  const queuePreview = await previewQueue(f.actor, { printerId: f.printer.id, batchIds: [b.id, a.id] });
  await reorderQueue(f.actor, {
    ...(await planningMeta()),
    previewAsOf: queuePreview.asOf, previewFingerprint: queuePreview.fingerprint,
    printerId: f.printer.id,
    batchIds: [b.id, a.id],
  });
  const before = await db.stockReservationEvent.count();
  const current = await db.planningBatch.findUniqueOrThrow({
    where: { id: a.id },
  });
  expect(
    (
      await cancelBatch(f.actor, {
        ...(await planningMeta(current.version)),
        batchId: a.id,
        reason: "Ajuste de fila",
      })
    ).state,
  ).toBe("CANCELED");
  expect(await db.stockReservationEvent.count()).toBe(before);
});
it("records remaining time without changing queue position and rejects out of order markers", async () => {
  const f = await planningFixture();
  let b = await scheduledBatch(f);
  await expect(
    recordMilestone(f.actor, {
      ...(await planningMeta(b.version)),
      batchId: b.id,
      kind: "PRINT_END",
      instant: new Date().toISOString(),
    }),
  ).rejects.toThrow();
  for (const kind of ["PREPARE_START", "PRINT_START", "REMAINING"]) {
    b = await recordMilestone(f.actor, {
      ...(await planningMeta(b.version)),
      batchId: b.id,
      kind,
      instant: new Date().toISOString(),
      ...(kind === "REMAINING" ? { remainingMinutes: "90" } : {}),
    });
  }
  expect(b.remainingMinutes).toBe("90");
  expect(b.position).toBe(1);
});
