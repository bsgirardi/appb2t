import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
export type GoogleEnvelope = {
  actorId: string;
  expiresAt: number;
  [key: string]: unknown;
};
function encryptionKey() {
  const key = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? "";
  if (!/^[a-fA-F0-9]{64}$/.test(key))
    throw new Error("Configure a chave dedicada da integração Google.");
  return Buffer.from(key, "hex");
}
export function sealGoogle(value: GoogleEnvelope) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from("b2t:google:v1"));
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
export function openGoogle(
  value: string | undefined,
  actorId: string,
): GoogleEnvelope | null {
  if (!value || value.length > 6000) return null;
  try {
    const data = Buffer.from(value, "base64url");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      data.subarray(0, 12),
    );
    decipher.setAAD(Buffer.from("b2t:google:v1"));
    decipher.setAuthTag(data.subarray(12, 28));
    const payload = JSON.parse(
      Buffer.concat([
        decipher.update(data.subarray(28)),
        decipher.final(),
      ]).toString("utf8"),
    ) as GoogleEnvelope;
    return payload.actorId === actorId &&
      typeof payload.expiresAt === "number" &&
      payload.expiresAt > Date.now()
      ? payload
      : null;
  } catch {
    return null;
  }
}
export function verifyOAuthState(expected: string, actual: string) {
  const a = Buffer.from(expected),
    b = Buffer.from(actual);
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}
export const reportingScopes =
  "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly";
export function oauthAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  challenge: string,
) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: reportingScopes,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent select_account",
  }).toString();
  return url.href;
}
