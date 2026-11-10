import { afterEach, expect, it, vi } from "vitest";
import {
  sealGoogle,
  openGoogle,
  oauthAuthorizationUrl,
  verifyOAuthState,
} from "@/server/google/security";
afterEach(() => vi.unstubAllEnvs());
it("encrypts tokens, rejects tampering, wrong actor and expired credentials", () => {
  vi.stubEnv("GOOGLE_TOKEN_ENCRYPTION_KEY", "a".repeat(64));
  const value = sealGoogle({
    actorId: "admin-a",
    expiresAt: Date.now() + 10000,
    token: "private-token",
  });
  expect(value).not.toContain("private-token");
  expect(openGoogle(value, "admin-a")?.token).toBe("private-token");
  expect(openGoogle(value, "admin-b")).toBeNull();
  expect(openGoogle(value.slice(0, -5) + "xxxxx", "admin-a")).toBeNull();
  expect(
    openGoogle(sealGoogle({ actorId: "admin-a", expiresAt: 1 }), "admin-a"),
  ).toBeNull();
});
it("requires a dedicated key and validates OAuth state", () => {
  vi.stubEnv("GOOGLE_TOKEN_ENCRYPTION_KEY", "");
  expect(() => sealGoogle({ actorId: "a", expiresAt: 1 })).toThrow();
  expect(verifyOAuthState("expected", "wrong")).toBe(false);
  expect(verifyOAuthState("expected", "expected")).toBe(true);
});
it("requests only reporting scopes and pins redirect/state/PKCE", () => {
  const url = new URL(
    oauthAuthorizationUrl(
      "client",
      "https://b2t.test/api/marketing/google/callback",
      "state",
      "challenge",
    ),
  );
  expect(url.searchParams.get("scope")).toBe(
    "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly",
  );
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  expect(url.searchParams.get("state")).toBe("state");
});
