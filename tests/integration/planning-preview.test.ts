import { expect, it, vi } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { previewQueue } from "@/server/planning/queue-preview";
import { reorderQueue } from "@/server/planning/milestones";
import { planningFixture, planningMeta, scheduledBatch } from "../fixtures/planning";
import { releaseOrderReservation } from "@/server/production/reservations";
import { meta } from "../fixtures/production";
setupDatabase("e3");
it("previews without writing and applies once with replay after expiry", async () => {
  const f = await planningFixture(), a = await scheduledBatch(f), b = await scheduledBatch(f);
  const scenario = { printerId: f.printer.id, batchIds: [b.id, a.id] };
  const read = async () => ({ state: await db.planningState.findUnique({ where: { id: 1 } }),
    commands: await db.planningCommand.count(), audit: await db.planningAudit.count(),
    rows: await db.planningBatch.findMany({ orderBy: { id: "asc" } }) });
  const before = await read();
  const preview = await previewQueue(f.actor, scenario);
  expect(await read()).toEqual(before);
  const payload = { ...(await planningMeta()), ...scenario, previewAsOf: preview.asOf, previewFingerprint: preview.fingerprint };
  const applied = await reorderQueue(f.actor, payload);
  expect((await db.planningBatch.findUniqueOrThrow({ where: { id: b.id } })).position).toBe(1);
  // Replay lookup precedes validity/revision checks, even after application changed the input.
  const later = Date.now() + 120000;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(later);
  try { expect(await reorderQueue(f.actor, payload)).toEqual(applied); }
  finally { vi.useRealTimers(); }
  await expect(reorderQueue(f.actor, { ...payload, operationKey: crypto.randomUUID() })).rejects.toMatchObject({ code: "CONFLICT" });
});
it("permits an active operator but rejects changed role and inactive users", async () => {
  const f = await planningFixture(), b = await scheduledBatch(f);
  const operator = await seedUser("OPERATOR", "e3-operator@example.test");
  const scenario = { printerId: f.printer.id, batchIds: [b.id] };
  expect((await previewQueue(operator, scenario)).after.batches).toHaveLength(1);
  await db.user.update({ where: { id: operator.id }, data: { active: false } });
  await expect(previewQueue(operator, scenario)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await db.user.update({ where: { id: operator.id }, data: { active: true, role: "ADMIN" } });
  await expect(previewQueue(operator, scenario)).rejects.toMatchObject({ code: "FORBIDDEN" });
});
it("rejects a preview after material release without writing positions", async () => {
  const f = await planningFixture(), b = await scheduledBatch(f, 10);
  const scenario = { printerId: f.printer.id, batchIds: [b.id] }, preview = await previewQueue(f.actor, scenario);
  const payload = { ...(await planningMeta()), ...scenario, previewAsOf: preview.asOf, previewFingerprint: preview.fingerprint };
  const order = await db.productionOrder.findUniqueOrThrow({ where: { id: f.order.id } });
  await releaseOrderReservation(f.actor, { ...meta(order.version), allocationId: f.allocation.id, quantity: "50", reason: "Revisão E3" });
  const count = await db.planningAudit.count();
  await expect(reorderQueue(f.actor, payload)).rejects.toMatchObject({ code: "CONFLICT" });
  expect(await db.planningAudit.count()).toBe(count);
  expect((await db.planningBatch.findUniqueOrThrow({ where: { id: b.id } })).state).toBe("PENDING");
});
it("detects changed machine eligibility even without a planning revision change", async () => {
  const f = await planningFixture(), b = await scheduledBatch(f);
  const scenario = { printerId: f.printer.id, batchIds: [b.id] }, preview = await previewQueue(f.actor, scenario);
  const payload = { ...(await planningMeta()), ...scenario, previewAsOf: preview.asOf, previewFingerprint: preview.fingerprint };
  await db.printer.update({ where: { id: f.printer.id }, data: { active: false } });
  await expect(reorderQueue(f.actor, payload)).rejects.toMatchObject({ code: "CONFLICT" });
});
it("serializes material release against confirming the simulated sequence", async () => {
  const f = await planningFixture(), b = await scheduledBatch(f, 10);
  const scenario = { printerId: f.printer.id, batchIds: [b.id] }, preview = await previewQueue(f.actor, scenario);
  const payload = { ...(await planningMeta()), ...scenario, previewAsOf: preview.asOf, previewFingerprint: preview.fingerprint };
  const order = await db.productionOrder.findUniqueOrThrow({ where: { id: f.order.id } });
  const [apply, release] = await Promise.allSettled([
    reorderQueue(f.actor, payload),
    releaseOrderReservation(f.actor, { ...meta(order.version), allocationId: f.allocation.id, quantity: "50", reason: "Revisão concorrente E3" }),
  ]);
  expect(release.status).toBe("fulfilled");
  if (apply.status === "rejected") expect(apply.reason).toMatchObject({ code: "CONFLICT" });
  expect((await db.planningBatch.findUniqueOrThrow({ where: { id: b.id } })).state).toBe("PENDING");
});
