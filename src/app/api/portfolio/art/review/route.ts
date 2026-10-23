import { endpoint, ok } from "@/lib/http";
import { readArtReview } from "@/server/art/access";
import { artSessionCookie } from "@/server/art/cookies";
export function GET(request: Request) {
  return endpoint(async () => {
    const id = new URL(request.url).searchParams.get("revision") ?? "";
    return ok(await readArtReview(await artSessionCookie(id), id));
  });
}
