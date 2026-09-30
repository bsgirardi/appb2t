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
type Handler = (
  r: Request,
  c: { params: Promise<{ id: string }> },
) => Promise<Response>;
const routes = import.meta.glob("/src/app/api/finance/**/route.ts", {
  eager: true,
}) as Record<string, Record<string, Handler>>;
import {
  POST as accountPost,
  GET as accountGet,
} from "@/app/api/finance/accounts/route";
import { PUT as accountPut } from "@/app/api/finance/accounts/[id]/route";
import { GET as exportGet } from "@/app/api/finance/export/route";
import FinancePage from "@/app/(private)/financeiro/page";
import AccountsPage from "@/app/(private)/financeiro/contas/page";
import EntriesPage from "@/app/(private)/financeiro/lancamentos/page";
import MovementsPage from "@/app/(private)/financeiro/movimentos/page";
setupDatabase();
function request(
  method = "GET",
  body: unknown = {},
  origin = "http://localhost:3000",
) {
  return new Request("http://localhost:3000/api/finance/accounts", {
    method,
    headers: { origin, "content-type": "application/json" },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
}
async function signIn(role: "ADMIN" | "OPERATOR") {
  const actor = await seedUser(role);
  session.token = "f".repeat(64);
  await db.session.create({
    data: {
      tokenHash: tokenHash(session.token),
      userId: actor.id,
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  return actor;
}
it("guards every financial route for visitor, operator and revoked session", async () => {
  process.env.APP_URL = "http://localhost:3000";
  const ctx = { params: Promise.resolve({ id: "missing" }) };
  expect(Object.keys(routes)).toHaveLength(18);
  for (const status of [401, 403, 401]) {
    if (status === 403) await signIn("OPERATOR");
    else {
      session.token = undefined;
    }
    for (const [path, methods] of Object.entries(routes))
      for (const [method, handler] of Object.entries(methods)) {
        expect(
          (await handler(request(method), ctx)).status,
          `${path} ${method}`,
        ).toBe(status);
      }
  }
  session.token = "f".repeat(64);
  await db.session.deleteMany();
  expect((await accountGet()).status).toBe(401);
});
it("checks admin, origin, optimistic versions and safe export", async () => {
  process.env.APP_URL = "http://localhost:3000";
  await signIn("ADMIN");
  const input = {
    name: "Conta HTTP",
    type: "BANK",
    openingBalance: "0",
    openingDate: "2026-01-01",
    active: true,
  };
  expect(
    (await accountPost(request("POST", input, "https://foreign.test"))).status,
  ).toBe(403);
  expect(await db.financialAccount.count()).toBe(0);
  expect(
    (
      await accountPost(
        request("POST", { ...input, openingBalance: "10000000000000000.00" }),
      )
    ).status,
  ).toBe(422);
  const response = await accountPost(request("POST", input));
  expect(response.status).toBe(200);
  const account = (await response.json()).data;
  const context = { params: Promise.resolve({ id: account.id }) };
  expect(
    (
      await accountPut(
        request("PUT", { ...input, expectedVersion: 1 }),
        context,
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await accountPut(
        request("PUT", { ...input, expectedVersion: 1 }),
        context,
      )
    ).status,
  ).toBe(409);
  expect((await exportGet(request())).headers.get("content-type")).toContain(
    "text/csv",
  );
});
it("denies direct financial page reads to operators", async () => {
  await signIn("OPERATOR");
  const props = { searchParams: Promise.resolve({}) };
  await expect(FinancePage(props)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(AccountsPage()).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(EntriesPage(props)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(MovementsPage(props)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
