import { z } from "zod";
import {
  parseInstagramMedia,
  newestInstagramPosts,
} from "@/domain/marketing/instagram";
export class InstagramError extends Error {
  constructor(
    public code:
      "authorization" | "rate_limit" | "unavailable" | "wrong_account",
  ) {
    super("Instagram indisponível.");
  }
}
export async function boundedInstagramBody(
  response: Response,
  maximum: number,
) {
  if (Number(response.headers.get("content-length")) > maximum)
    throw new InstagramError("unavailable");
  const reader = response.body?.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  if (!reader) throw new InstagramError("unavailable");
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) {
      await reader.cancel();
      throw new InstagramError("unavailable");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
async function graph(
  path: string,
  fields: string,
  token: string,
  version: string,
  cursor?: string,
) {
  const url = new URL(`https://graph.instagram.com/${version}/${path}`);
  url.searchParams.set("fields", fields);
  if (path.endsWith("/media")) url.searchParams.set("limit", "50");
  if (cursor) url.searchParams.set("after", cursor);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  let body: unknown;
  try {
    body = JSON.parse(
      (await boundedInstagramBody(response, 1024 * 1024)).toString("utf8"),
    );
  } catch {
    throw new InstagramError("unavailable");
  }
  if (!response.ok) {
    const error = z
      .object({ error: z.object({ code: z.number().optional() }) })
      .safeParse(body);
    const code = error.success ? error.data.error.code : undefined;
    throw new InstagramError(
      code === 190 || response.status === 401 || response.status === 403
        ? "authorization"
        : response.status === 429 || code === 4 || code === 17 || code === 613
          ? "rate_limit"
          : "unavailable",
    );
  }
  return body;
}
export async function fetchInstagramPosts(token: string, version: string) {
  if (!token || !/^v\d{1,2}\.\d$/.test(version))
    throw new InstagramError("authorization");
  const identity = await graph("me", "user_id,username", token, version);
  const value = z
    .object({ data: z.array(z.unknown()).length(1) })
    .safeParse(identity);
  const account = z
    .object({ user_id: z.string().regex(/^\d+$/), username: z.string() })
    .safeParse(value.success ? value.data.data[0] : identity);
  if (!account.success || account.data.username.toLowerCase() !== "somosb2t")
    throw new InstagramError("wrong_account");
  const posts = [];
  let cursor: string | undefined;
  for (let page = 0; page < 2; page++) {
    const body = await graph(
      `${account.data.user_id}/media`,
      "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
      token,
      version,
      cursor,
    );
    const result = z
      .object({
        data: z.array(z.unknown()).max(100),
        paging: z
          .object({
            cursors: z
              .object({ after: z.string().max(2000).optional() })
              .optional(),
            next: z.string().optional(),
          })
          .optional(),
      })
      .safeParse(body);
    if (!result.success) throw new InstagramError("unavailable");
    const valid = result.data.data
      .map(parseInstagramMedia)
      .filter((p) => p !== null);
    if (result.data.data.length && !valid.length)
      throw new InstagramError("unavailable");
    posts.push(...valid);
    cursor = result.data.paging?.cursors?.after;
    if (!result.data.paging?.next || !cursor) break;
  }
  return newestInstagramPosts(posts, [], 24);
}
