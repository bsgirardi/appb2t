import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { requestHash } from "./receive";
export const REQUEST_BROWSER_COOKIE = "b2t_request_browser";
export function browserToken(request: Request): string | null {
  const parts = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p.startsWith(`${REQUEST_BROWSER_COOKIE}=`));
  if (parts.length !== 1) return null;
  const token = parts[0].slice(REQUEST_BROWSER_COOKIE.length + 1);
  return /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export async function requestBrowserId(
  request: Request,
): Promise<string | null> {
  const token = browserToken(request);
  if (!token) return null;
  const row = await db.catalogRequestBrowser.findUnique({
    where: { id: requestHash(token) },
  });
  return row && row.expiresAt > new Date() ? row.id : null;
}
export async function initializeRequestBrowser(
  request: Request,
): Promise<string | null> {
  if (await requestBrowserId(request)) return null;
  const token = randomBytes(32).toString("hex");
  await db.catalogRequestBrowser.create({
    data: {
      id: requestHash(token),
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  return token;
}
