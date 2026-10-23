import { endpoint } from "@/lib/http";
import { artSessionCookie } from "@/server/art/cookies";
import { readPublicArtFile } from "@/server/art/access";
import { artFileResponse } from "@/server/art/http";
export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const url = new URL(request.url);
    const revisionId = url.searchParams.get("revision") ?? "";
    const file = await readPublicArtFile(
      await artSessionCookie(revisionId),
      revisionId,
      (await context.params).id,
    );
    return artFileResponse(file, url.searchParams.get("preview") === "1");
  });
}
