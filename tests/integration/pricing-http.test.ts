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
import { GET } from "@/app/api/pricing/catalog/route";
import { POST } from "@/app/api/pricing/settings/route";
setupDatabase();
it("requires login for catalog and refuses operator tariff writes", async () => {
  process.env.APP_URL = "http://localhost:3000";
  session.token = undefined;
  expect(
    (await GET(new Request("http://localhost:3000/api/pricing/catalog")))
      .status,
  ).toBe(401);
  const a = await seedUser("OPERATOR");
  session.token = "c".repeat(64);
  await db.session.create({
    data: {
      tokenHash: tokenHash(session.token),
      userId: a.id,
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  expect(
    (await GET(new Request("http://localhost:3000/api/pricing/catalog")))
      .status,
  ).toBe(200);
  expect(
    (
      await POST(
        new Request("http://localhost:3000/api/pricing/settings", {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            "content-type": "application/json",
          },
          body: "{}",
        }),
      )
    ).status,
  ).toBe(403);
});
