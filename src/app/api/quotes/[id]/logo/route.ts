import { endpoint } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    await requireActor();
    const logo = await db.documentLogo.findUnique({
      where: { quoteId: (await context.params).id },
    });
    if (!logo) throw new AppError("NOT_FOUND", "Logo não encontrado.");
    return new Response(new Uint8Array(logo.bytes), {
      headers: {
        "Content-Type": logo.mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
