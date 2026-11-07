import { beforeEach, expect, it, vi } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { tokenHash } from "@/server/auth/session";
const cookie = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (cookie.token ? { value: cookie.token } : undefined),
  }),
}));
import { GET, POST } from "@/app/api/commercial-settings/route";
setupDatabase();
beforeEach(() => {
  cookie.token = undefined;
  process.env.APP_URL = "http://localhost:3194";
});
const request = (version = 0) =>
  new Request("http://localhost:3194/api/commercial-settings", {
    method: "POST",
    headers: {
      origin: "http://localhost:3194",
      "content-type": "application/json",
    },
    body: JSON.stringify({ replyWaitDays: 21, expectedVersion: version }),
  });
it.each(["ADMIN", "OPERATOR"] as const)(
  "config preference access and no-store for %s",
  async (role) => {
    expect((await GET()).status).toBe(401);
    const actor = await seedUser(role);
    cookie.token = "c".repeat(64);
    await db.session.create({
      data: {
        tokenHash: tokenHash(cookie.token),
        userId: actor.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    const read = await GET();
    expect(read.status).toBe(role === "ADMIN" ? 200 : 403);
    expect(read.headers.get("Cache-Control")).toBe("no-store");
    expect((await POST(request())).status).toBe(role === "ADMIN" ? 200 : 403);
    if (role === "ADMIN") {
      expect((await POST(request())).status).toBe(409);
      expect(
        await db.commercialSettings.findUnique({ where: { id: 1 } }),
      ).toMatchObject({ replyWaitDays: 21, updatedById: actor.id });
    } else expect(await db.commercialSettings.count()).toBe(0);
    await db.user.update({ where: { id: actor.id }, data: { active: false } });
    expect((await GET()).status).toBe(401);
  },
);
