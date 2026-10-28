import { beforeEach, expect, it, vi } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { db } from "@/lib/db";
import { tokenHash } from "@/server/auth/session";
import { saveCustomer } from "@/server/customers";
const cookie = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (cookie.token ? { value: cookie.token } : undefined),
  }),
}));
import { GET, POST } from "@/app/api/opportunities/route";
setupDatabase();
beforeEach(() => {
  cookie.token = undefined;
  process.env.APP_URL = "http://localhost:3194";
});
const request = (body?: unknown) =>
  new Request(
    "http://localhost:3194/api/opportunities",
    body
      ? {
          method: "POST",
          headers: {
            origin: "http://localhost:3194",
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        }
      : undefined,
  );
it.each(["ADMIN", "OPERATOR"] as const)(
  "allows %s sessions to create and read internal opportunities",
  async (role) => {
    const actor = await seedUser(role);
    cookie.token = "a".repeat(64);
    await db.session.create({
      data: {
        tokenHash: tokenHash(cookie.token),
        userId: actor.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    const customer = await saveCustomer(actor, undefined, {
      name: "Cliente teste",
      type: "PERSON",
      active: true,
    });
    const fields = {
      title: "Teste",
      customerId: customer.id,
      ownerId: actor.id,
      stage: "CONTATO",
      nextAction: "Retornar",
      nextContactDate: "2026-10-29",
      pendingNotes: "PRIVADO-E4",
    };
    const response = await POST(
      request({ action: "CREATE", operationKey: "create-internal", fields }),
    );
    expect(response.status).toBe(200);
    expect((await GET(request())).status).toBe(200);
    const invalid = await POST(
      request({
        action: "CREATE",
        operationKey: "second-command",
        fields,
        wonSaleId: "injetado",
      }),
    );
    expect(invalid.status).toBe(422);
    expect(await db.opportunity.count()).toBe(1);
    await db.user.update({ where: { id: actor.id }, data: { active: false } });
    expect((await GET(request())).status).toBe(401);
  },
);
