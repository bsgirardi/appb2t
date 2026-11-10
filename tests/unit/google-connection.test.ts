import { beforeEach, afterEach, expect, it, vi } from "vitest";
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { value: jar.get(name) } : undefined,
    set: (name: string, value: string) => jar.set(name, value),
    delete: ({ name }: { name: string }) => jar.delete(name),
  }),
}));
import {
  startGoogleConnection,
  finishGoogleConnection,
  googleAccessToken,
  disconnectGoogle,
} from "@/server/google/connection";
import { openGoogle, reportingScopes } from "@/server/google/security";
beforeEach(() => {
  jar.clear();
  vi.stubEnv("GOOGLE_TOKEN_ENCRYPTION_KEY", "b".repeat(64));
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "client-id");
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "never-public");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("completes authorized PKCE flow and stores only encrypted, actor-bound credentials", async () => {
  const url = new URL(await startGoogleConnection("admin"));
  expect(url.href).not.toContain("never-public");
  const request = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          access_token: "access",
          refresh_token: "refresh",
          expires_in: 3600,
          scope: reportingScopes,
        }),
        { status: 200 },
      ),
  );
  vi.stubGlobal("fetch", request);
  await finishGoogleConnection(
    "admin",
    new URL(
      `http://localhost:3000/api/marketing/google/callback?code=test&state=${url.searchParams.get("state")}`,
    ),
  );
  expect(jar.has("b2t_google_state")).toBe(false);
  expect(jar.get("b2t_google_reports")).not.toContain("refresh");
  expect(openGoogle(jar.get("b2t_google_reports"), "other")).toBeNull();
  expect(await googleAccessToken("admin")).toBe("access");
  const body = new URLSearchParams(
    (request.mock.calls[0] as unknown as [string, RequestInit])[1]
      .body as URLSearchParams,
  );
  expect(body.get("code_verifier")!.length).toBeGreaterThan(40);
  await disconnectGoogle();
  expect(await googleAccessToken("admin")).toBeNull();
});
it.each(["wrong-state", "wrong-actor"])(
  "rejects %s before exchanging a code",
  async (reason) => {
    const url = new URL(await startGoogleConnection("admin"));
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(
      finishGoogleConnection(
        reason === "wrong-actor" ? "other" : "admin",
        new URL(
          `http://localhost:3000/api/marketing/google/callback?code=test&state=${reason === "wrong-state" ? "invalid" : url.searchParams.get("state")}`,
        ),
      ),
    ).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
    expect(jar.has("b2t_google_state")).toBe(false);
  },
);
it("refuses incomplete reporting permissions and does not save a connection", async () => {
  const url = new URL(await startGoogleConnection("admin"));
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "access",
            expires_in: 3600,
            scope: "https://www.googleapis.com/auth/analytics.readonly",
          }),
          { status: 200 },
        ),
    ),
  );
  await expect(
    finishGoogleConnection(
      "admin",
      new URL(
        `http://localhost:3000/api/marketing/google/callback?code=test&state=${url.searchParams.get("state")}`,
      ),
    ),
  ).rejects.toThrow();
  expect(jar.has("b2t_google_reports")).toBe(false);
});
