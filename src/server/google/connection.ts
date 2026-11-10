import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { appUrl } from "@/lib/env";
import { AppError } from "@/lib/errors";
import {
  openGoogle,
  sealGoogle,
  oauthAuthorizationUrl,
  reportingScopes,
  verifyOAuthState,
} from "./security";
export const CONNECTION_COOKIE = "b2t_google_reports";
const STATE_COOKIE = "b2t_google_state";
const cookieOptions = {
  httpOnly: true,
  secure: appUrl().protocol === "https:",
  sameSite: "lax" as const,
  path: "/api/marketing/google",
};
const callback = () => new URL("/api/marketing/google/callback", appUrl()).href;
export function googleConfigured() {
  return (
    !!process.env.GOOGLE_OAUTH_CLIENT_ID &&
    !!process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    /^[a-fA-F0-9]{64}$/.test(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? "")
  );
}
export async function startGoogleConnection(actorId: string) {
  if (!googleConfigured())
    throw new AppError(
      "VALIDATION",
      "A integração Google ainda precisa ser configurada no servidor.",
    );
  const state = randomBytes(32).toString("base64url"),
    verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  (await cookies()).set(
    STATE_COOKIE,
    sealGoogle({ actorId, state, verifier, expiresAt: Date.now() + 600000 }),
    { ...cookieOptions, maxAge: 600 },
  );
  return oauthAuthorizationUrl(
    process.env.GOOGLE_OAUTH_CLIENT_ID!,
    callback(),
    state,
    challenge,
  );
}
type TokenReply = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};
async function tokenRequest(
  fields: Record<string, string>,
): Promise<TokenReply> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      ...fields,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new AppError(
      "FORBIDDEN",
      "A autorização Google expirou ou foi recusada. Conecte novamente.",
    );
  const data = (await response.json()) as TokenReply;
  if (!data.access_token || !data.expires_in)
    throw new AppError(
      "FORBIDDEN",
      "O Google não concluiu a autorização. Conecte novamente.",
    );
  return data;
}
export async function finishGoogleConnection(actorId: string, url: URL) {
  const jar = await cookies();
  const saved = openGoogle(jar.get(STATE_COOKIE)?.value, actorId);
  jar.delete({ name: STATE_COOKIE, path: cookieOptions.path });
  if (
    !saved ||
    typeof saved.state !== "string" ||
    typeof saved.verifier !== "string" ||
    !verifyOAuthState(saved.state, url.searchParams.get("state") ?? "")
  )
    throw new AppError(
      "FORBIDDEN",
      "A conexão não foi confirmada. Inicie novamente.",
    );
  const code = url.searchParams.get("code");
  if (url.searchParams.has("error") || !code || code.length > 4096)
    throw new AppError(
      "FORBIDDEN",
      "Você pode conectar o Google quando desejar.",
    );
  const token = await tokenRequest({
    code,
    code_verifier: saved.verifier,
    redirect_uri: callback(),
    grant_type: "authorization_code",
  });
  const granted = new Set((token.scope ?? "").split(" "));
  if (!reportingScopes.split(" ").every((scope) => granted.has(scope)))
    throw new AppError(
      "FORBIDDEN",
      "Autorize a leitura do Analytics e Search Console para concluir.",
    );
  await saveToken(actorId, token);
}
async function saveToken(
  actorId: string,
  token: TokenReply,
  previousRefresh?: string,
) {
  const value = sealGoogle({
    actorId,
    expiresAt: Date.now() + 30 * 86400000,
    accessToken: token.access_token!,
    accessExpires: Date.now() + Math.min(token.expires_in!, 3600) * 1000,
    refreshToken: token.refresh_token ?? previousRefresh ?? "",
  });
  if (value.length > 3800)
    throw new AppError(
      "VALIDATION",
      "A autorização excede o limite seguro. Use outra conta Google.",
    );
  (await cookies()).set(CONNECTION_COOKIE, value, {
    ...cookieOptions,
    maxAge: 30 * 86400,
  });
}
export async function googleAccessToken(actorId: string) {
  const saved = openGoogle(
    (await cookies()).get(CONNECTION_COOKIE)?.value,
    actorId,
  );
  if (!saved || typeof saved.accessToken !== "string") return null;
  if (
    typeof saved.accessExpires === "number" &&
    saved.accessExpires > Date.now() + 60000
  )
    return saved.accessToken;
  if (typeof saved.refreshToken !== "string" || !saved.refreshToken)
    throw new AppError("FORBIDDEN", "Conecte novamente sua conta Google.");
  const token = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: saved.refreshToken,
  });
  await saveToken(actorId, token, saved.refreshToken);
  return token.access_token!;
}
export async function disconnectGoogle() {
  const jar = await cookies();
  jar.delete({ name: CONNECTION_COOKIE, path: cookieOptions.path });
  jar.delete({ name: STATE_COOKIE, path: cookieOptions.path });
}
