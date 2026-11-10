import { z } from "zod";
export const INSTAGRAM_PROFILE = "https://www.instagram.com/somosb2t/";
export function isInstagramCdn(raw: string) {
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      ["cdninstagram.com", "fbcdn.net"].some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      )
    );
  } catch {
    return false;
  }
}
const id = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const date = z
  .string()
  .max(40)
  .refine(
    (s) =>
      /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(s) && Number.isFinite(Date.parse(s)),
    "Data inválida.",
  );
export const instagramPostSchema = z
  .object({
    id,
    publishedAt: date,
    title: z.string().trim().min(1).max(220),
    alt: z.string().trim().max(250).optional(),
    image: z
      .string()
      .regex(
        /^\/(?:instagram\/[A-Za-z0-9_-]+\.webp|api\/instagram\/media\/[A-Za-z0-9_-]+)$/,
      ),
    sourceImage: z.string().max(3000).refine(isInstagramCdn).optional(),
    permalink: z
      .string()
      .regex(
        /^https:\/\/www\.instagram\.com\/(?:somosb2t\/)?(?:p|reel)\/[A-Za-z0-9_-]+\/$/,
      ),
    kind: z.enum(["IMAGE", "VIDEO", "CAROUSEL_ALBUM"]),
  })
  .strict();
export type InstagramPost = z.infer<typeof instagramPostSchema>;
export const instagramSettingsSchema = z
  .object({
    enabled: z.boolean().default(true),
    hiddenIds: z.array(id).max(100).default([]),
    posts: z.array(instagramPostSchema).max(24).optional(),
    lastAttemptAt: date.optional(),
    lastSuccessAt: date.optional(),
    lastError: z
      .enum(["authorization", "rate_limit", "unavailable", "wrong_account"])
      .optional(),
  })
  .strict();
export type InstagramSettings = z.infer<typeof instagramSettingsSchema>;
export function newestInstagramPosts(
  posts: InstagramPost[],
  hiddenIds: string[],
  limit = 6,
) {
  const seen = new Set<string>(),
    hidden = new Set(hiddenIds);
  return [...posts]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .filter((p) => {
      if (hidden.has(p.id) || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    })
    .slice(0, limit);
}
export function parseInstagramMedia(raw: unknown): InstagramPost | null {
  const data = z
    .object({
      id,
      media_type: z.enum(["IMAGE", "VIDEO", "CAROUSEL_ALBUM"]),
      caption: z.string().optional(),
      timestamp: z.string(),
      media_url: z.string().optional(),
      thumbnail_url: z.string().optional(),
      permalink: z.string(),
    })
    .safeParse(raw);
  if (!data.success) return null;
  const media = data.data,
    timestamp = Date.parse(media.timestamp);
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 60000)
    return null;
  const title =
    media.caption?.replace(/\s+/g, " ").trim().slice(0, 220) ||
    "Publicação da B2T";
  // The shortcode is stable across the initial public selection and the API's numeric IDs.
  const shortcode = media.permalink.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)\/$/)?.[1];
  const post = instagramPostSchema.safeParse({
    id: shortcode,
    title,
    publishedAt: new Date(timestamp).toISOString(),
    image: `/api/instagram/media/${shortcode}`,
    sourceImage:
      media.media_type === "VIDEO" ? media.thumbnail_url : media.media_url,
    permalink: media.permalink,
    kind: media.media_type,
  });
  return post.success && post.data.sourceImage ? post.data : null;
}
