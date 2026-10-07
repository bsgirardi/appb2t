import { expect, it, vi } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { tokenHash } from "@/server/auth/session";
const session = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (session.token ? { value: session.token } : undefined),
  }),
}));
import { GET } from "@/app/api/stock/items/route";
import { POST } from "@/app/api/stock/commands/route";
setupDatabase();
it("protects stock routes, validates filters, origin, body size and admin actions", async () => {
  process.env.APP_URL = "http://localhost:3000";
  session.token = undefined;
  expect(
    (await GET(new Request("http://localhost:3000/api/stock/items"))).status,
  ).toBe(401);
  const actor = await seedUser("OPERATOR");
  session.token = "b".repeat(64);
  await db.session.create({
    data: {
      tokenHash: tokenHash(session.token),
      userId: actor.id,
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  expect(
    (
      await GET(
        new Request("http://localhost:3000/api/stock/items?negative=false"),
      )
    ).status,
  ).toBe(200);
  expect(
    (await GET(new Request("http://localhost:3000/api/stock/items?page=0")))
      .status,
  ).toBe(400);
  const send = (body: string, origin = "http://localhost:3000") =>
    POST(
      new Request("http://localhost:3000/api/stock/commands", {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body,
      }),
    );
  expect(
    (await send(JSON.stringify({ action: "ITEM", payload: {} }))).status,
  ).toBe(403);
  expect((await send("{}", "https://outside.example")).status).toBe(403);
  expect((await send("x".repeat(262145))).status).toBe(413);
  await db.user.update({ where: { id: actor.id }, data: { active: false } });
  expect(
    (await GET(new Request("http://localhost:3000/api/stock/items"))).status,
  ).toBe(401);
});
