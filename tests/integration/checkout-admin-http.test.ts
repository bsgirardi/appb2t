import { expect, it, vi } from "vitest";
const session = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (session.token ? { value: session.token } : undefined),
  }),
}));
import { randomBytes } from "node:crypto";
import { setupDatabase } from "./setup";
import { checkoutFixture } from "../fixtures/checkout";
import { db } from "@/lib/db";
import { tokenHash } from "@/server/auth/session";
import { prepareCheckout } from "@/server/checkout/confirm";
import { GET } from "@/app/api/checkouts/[id]/route";
setupDatabase();
it("requires an active team session and never returns access hashes in the administrative detail", async () => {
  session.token = undefined;
  const { actor, draft } = await checkoutFixture();
  await db.checkoutSession.create({
    data: { id: "s", expiresAt: new Date(Date.now() + 86400000) },
  });
  const review = await prepareCheckout(
    { sessionId: "s", checkoutId: null },
    draft,
    "a".repeat(64),
  );
  const request = new Request(
    `http://localhost:3000/api/checkouts/${review.id}`,
  );
  const context = { params: Promise.resolve({ id: review.id }) };
  expect((await GET(request, context)).status).toBe(401);
  session.token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      tokenHash: tokenHash(session.token),
      userId: actor.id,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  const response = await GET(request, context);
  expect(response.status).toBe(200);
  const { data } = await response.json();
  expect(data.review.total).toBe("75.00");
  expect(JSON.stringify(data)).not.toContain("tokenHash");
  await db.user.update({ where: { id: actor.id }, data: { active: false } });
  expect((await GET(request, context)).status).toBe(401);
});
