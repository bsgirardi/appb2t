import { cookies } from "next/headers";
import { endpoint } from "@/lib/http";
import { getProductImage } from "@/server/products";
import { getSession, SESSION_COOKIE } from "@/server/auth/session";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; imageId: string }> },
) {
  return endpoint(async () => {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const actor = token ? await getSession(token) : null;
    const { id, imageId } = await context.params;
    const image = await getProductImage(id, actor, imageId);
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
