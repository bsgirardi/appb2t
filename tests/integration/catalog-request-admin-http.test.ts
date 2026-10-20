import { beforeEach, expect, it, vi } from "vitest";
const session = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (session.token ? { value: session.token } : undefined),
  }),
}));
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { tokenHash } from "@/server/auth/session";
import { setupDatabase } from "./setup";
import { createCatalogRequestFixture } from "../fixtures/catalog-request-db";
import { GET } from "@/app/api/requests/route";
import { GET as detail } from "@/app/api/requests/[id]/route";
import { POST as change } from "@/app/api/requests/[id]/change/route";
import { POST as prepare } from "@/app/api/requests/[id]/prepare-quote/route";
import { GET as customers } from "@/app/api/requests/[id]/customers/route";
setupDatabase();
beforeEach(() => {
  session.token = undefined;
});
it("keeps every request contact and action behind a valid team session", async () => {
  const req = new Request("http://localhost:3000/api/requests");
  const context = { params: Promise.resolve({ id: "private" }) };
  for (const r of [
    await GET(req),
    await detail(req, context),
    await change(req, context),
    await prepare(req, context),
    await customers(req, context),
  ])
    expect(r.status).toBe(401);
});
it("allows active operators and rejects deactivated sessions", async () => {
  const { actor, request } = await createCatalogRequestFixture();
  await db.user.update({ where: { id: actor.id }, data: { role: "OPERATOR" } });
  session.token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      tokenHash: tokenHash(session.token),
      userId: actor.id,
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  const context = { params: Promise.resolve({ id: request.id }) };
  const req = new Request("http://localhost:3000/api/requests");
  const response = await detail(req, context);
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect((await response.json()).data.contact.name).toBe("Ana Silva");
  await db.user.update({ where: { id: actor.id }, data: { active: false } });
  expect((await detail(req, context)).status).toBe(401);
});
