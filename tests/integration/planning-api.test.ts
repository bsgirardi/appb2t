import { expect, it, vi } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { tokenHash } from "@/server/auth/session";
import {
  planningFixture,
  planningMeta,
  scheduledBatch,
} from "../fixtures/planning";
import { getPlanning } from "@/server/planning/queries";
import { recordMilestone } from "@/server/planning/milestones";
const session = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (session.token ? { value: session.token } : undefined),
  }),
}));
import { GET } from "@/app/api/planning/route";
import { POST } from "@/app/api/planning/commands/route";
setupDatabase();
const url = "http://localhost:3000/api/planning";
async function login(userId: string) {
  session.token = "c".repeat(64);
  await db.session.create({
    data: {
      tokenHash: tokenHash(session.token),
      userId,
      expiresAt: new Date(Date.now() + 60000),
    },
  });
}
const send = (body: unknown) =>
  POST(
    new Request(`${url}/commands`, {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
it("protects routes, rejects invalid filters and revalidates role", async () => {
  process.env.APP_URL = "http://localhost:3000";
  session.token = undefined;
  expect((await GET(new Request(url))).status).toBe(401);
  const actor = await seedUser("OPERATOR");
  await login(actor.id);
  expect((await GET(new Request(`${url}?state=INVALID`))).status).toBe(400);
  expect((await send({ action: "CALENDAR_SAVE", payload: {} })).status).toBe(
    403,
  );
  await db.user.update({ where: { id: actor.id }, data: { role: "ADMIN" } });
  await expect(getPlanning(actor)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await db.user.update({ where: { id: actor.id }, data: { active: false } });
  expect((await GET(new Request(url))).status).toBe(401);
});
it("returns operational data only, replays commands and rejects stale revision atomically", async () => {
  process.env.APP_URL = "http://localhost:3000";
  const f = await planningFixture();
  const operator = await seedUser("OPERATOR", "operator@example.test");
  await login(operator.id);
  const payload = {
    ...(await planningMeta()),
    printerId: f.printer.id,
    materialItemId: f.material.id,
    colorLabel: "Azul",
    participants: [{ lineId: f.order.lines[0].id, units: 5 }],
    profileConfirmed: true,
    fitConfirmed: true,
    durationMinutes: "60",
    durationConfirmed: true,
    prepareMinutes: "5",
    removeMinutes: "10",
  };
  const body = { action: "BATCH_SAVE", payload };
  const first = await send(body);
  expect(first.status).toBe(200);
  const firstJson = await first.json();
  expect(await (await send(body)).json()).toEqual(firstJson);
  expect(
    (
      await send({
        ...body,
        payload: { ...payload, operationKey: crypto.randomUUID() },
      })
    ).status,
  ).toBe(409);
  expect(await db.planningBatch.count()).toBe(1);
  const result = await getPlanning(operator);
  expect(result.warnings).toContain("Horários da equipe não configurados.");
  expect(result.lines[0].freeUnits).toBe(10);
  expect(JSON.stringify([result, firstJson])).not.toMatch(
    /acquisitionCost|manualUnitCost|costRevision|sellingPrice|unitCost|markup/,
  );
  expect(result.calendars).toEqual([]);
});
it("calculates all machines before filtering the visible queue", async () => {
  const f = await planningFixture();
  const a = await scheduledBatch(f);
  await recordMilestone(f.actor, {
    ...(await planningMeta(a.version)),
    batchId: a.id,
    kind: "PREPARE_START",
    instant: new Date().toISOString(),
  });
  const other = await db.printer.create({
    data: {
      name: "B",
      technology: "FDM",
      acquisitionCost: "10",
      amortizationMonths: 12,
      daysPerMonth: 20,
      hoursPerDay: "8",
      watts: "10",
    },
  });
  const all = await getPlanning(f.actor);
  const filtered = await getPlanning(f.actor, { printerId: other.id });
  expect(filtered.batches).toEqual([]);
  expect(filtered.forecast.batches.map((b) => b.batchId)).toEqual(
    all.forecast.batches.map((b) => b.batchId),
  );
  expect(filtered.forecast.batches.some((b) => b.batchId === a.id)).toBe(true);
});
