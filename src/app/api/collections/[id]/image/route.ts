import { cookies } from "next/headers";
import { endpoint } from "@/lib/http";
import { getCollectionImage } from "@/server/collections";
import { getSession, SESSION_COOKIE } from "@/server/auth/session";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const image = await getCollectionImage(
      (await context.params).id,
      token ? await getSession(token) : null,
    );
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
