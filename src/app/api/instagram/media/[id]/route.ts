import { getPublicAppearance } from "@/server/appearance";
import { instagramPosts } from "@/server/instagram";
import { boundedInstagramBody } from "@/server/instagram-client";
import { isInstagramCdn } from "@/domain/marketing/instagram";
import { normalizeImage } from "@/server/product-images";
const images = new Map<string, { until: number; bytes: Uint8Array }>();
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id))
    return new Response(null, { status: 404 });
  const identity = await getPublicAppearance();
  const post = instagramPosts(identity.storefront?.instagram, 24).find(
    (p) => p.id === id,
  );
  if (!post?.sourceImage || !isInstagramCdn(post.sourceImage))
    return new Response(null, { status: 404 });
  const cached = images.get(post.sourceImage);
  try {
    let bytes = cached && cached.until > Date.now() ? cached.bytes : undefined;
    if (!bytes) {
      const response = await fetch(post.sourceImage, {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
      if (
        !response.ok ||
        !/^image\/(?:jpeg|png|webp)(?:;|$)/i.test(
          response.headers.get("content-type") ?? "",
        )
      )
        throw new Error("image");
      const image = await normalizeImage(
        await boundedInstagramBody(response, 5 * 1024 * 1024),
        { maxBytes: 5 * 1024 * 1024, maxPixels: 16000000, maxDimension: 960 },
      );
      bytes = image.bytes;
      if (images.size >= 24) images.delete(images.keys().next().value!);
      images.set(post.sourceImage, { until: Date.now() + 600000, bytes });
    }
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
