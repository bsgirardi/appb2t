import { endpoint } from "@/lib/http";
import { getAppearanceLogo } from "@/server/appearance";
export async function GET() {
  return endpoint(async () => {
    const logo = await getAppearanceLogo();
    return new Response(new Uint8Array(logo.bytes), {
      headers: {
        "Content-Type": logo.mimeType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
