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
import { setupDatabase, seedUser } from "./setup";
import { GET, POST } from "@/app/api/kits/route";
import { PATCH } from "@/app/api/kits/[id]/route";
setupDatabase();
beforeEach(() => {
  session.token = undefined;
});
const request = (raw: unknown, origin = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/kits", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(raw),
  });
it("anonymous_cannot_access_kit_maintenance", async () => {
  expect((await GET()).status).toBe(401);
  expect((await POST(request({}))).status).toBe(401);
  expect(
    (await PATCH(request({}), { params: Promise.resolve({ id: "private" }) }))
      .status,
  ).toBe(401);
});
it("operator_can_manage_but_invalid_origin_and_inactive_session_fail", async () => {
  const actor = await seedUser("OPERATOR");
  session.token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      tokenHash: tokenHash(session.token),
      userId: actor.id,
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  const input = {
    name: "Kit rascunho",
    description: "",
    active: false,
    position: 0,
    productIds: [],
    tiers: [],
  };
  const created = await POST(request(input));
  expect(created.status).toBe(200);
  expect(created.headers.get("cache-control")).toBe("no-store");
  const kit = (await created.json()).data;
  expect(
    (
      await PATCH(request({ ...input, expectedVersion: 1 }), {
        params: Promise.resolve({ id: kit.id }),
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await PATCH(request({ ...input, expectedVersion: 1 }), {
        params: Promise.resolve({ id: kit.id }),
      })
    ).status,
  ).toBe(409);
  expect((await POST(request(input, "https://foreign.test"))).status).toBe(403);
  await db.user.update({ where: { id: actor.id }, data: { active: false } });
  expect((await GET()).status).toBe(401);
});
