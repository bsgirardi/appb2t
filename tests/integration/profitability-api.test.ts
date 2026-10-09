import { expect, it, vi } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { tokenHash } from "@/server/auth/session";
import { profitabilitySale } from "../fixtures/profitability-db";
import { adminPayload } from "../fixtures/profitability";
import { meta, date } from "../fixtures/production";
const session = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (session.token ? { value: session.token } : undefined),
  }),
}));
import { GET } from "@/app/api/profitability/route";
import { GET as detail } from "@/app/api/profitability/sales/[id]/route";
import { POST } from "@/app/api/profitability/revisions/route";
setupDatabase();
it("protects reports, detail and replay with current identity and no shared cache", async () => {
  process.env.APP_URL = "http://localhost:3000";
  session.token = undefined;
  const req = () =>
    new Request(
      "http://localhost:3000/api/profitability?from=2026-10-01&to=2026-10-31",
    );
  expect((await GET(req())).status).toBe(401);
  const a = await seedUser("ADMIN"),
    s = await profitabilitySale(a.id);
  session.token = "c".repeat(64);
  await db.session.create({
    data: {
      userId: a.id,
      tokenHash: tokenHash(session.token),
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  const r = await GET(req());
  expect(r.status).toBe(200);
  expect(r.headers.get("cache-control")).toBe("no-store");
  expect(
    (await detail(req(), { params: Promise.resolve({ id: s.saleId }) })).status,
  ).toBe(200);
  expect(await db.profitabilityAssessment.count()).toBe(0);
  expect(await db.productionCostRevision.count()).toBe(0);
  expect(
    (await GET(new Request("http://localhost:3000/api/profitability?page=0")))
      .status,
  ).toBe(400);
  const body = {
    ...meta(),
    saleId: s.saleId,
    effectiveDate: date(),
    reason: "Conferência",
    payload: adminPayload(),
  };
  const send = (origin = "http://localhost:3000") =>
    POST(
      new Request("http://localhost:3000/api/profitability/revisions", {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  expect((await send("https://outside.example")).status).toBe(403);
  expect((await send()).status).toBe(200);
  await db.user.update({ where: { id: a.id }, data: { role: "OPERATOR" } });
  expect((await GET(req())).status).toBe(403);
  expect((await send()).status).toBe(403);
  await db.user.update({ where: { id: a.id }, data: { active: false } });
  expect((await GET(req())).status).toBe(401);
});
