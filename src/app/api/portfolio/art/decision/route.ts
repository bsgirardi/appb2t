import { z } from "zod";
import { endpoint, jsonBody, ok } from "@/lib/http";
import { decideArt } from "@/server/art/decisions";
import { artSessionCookie } from "@/server/art/cookies";
export function POST(request: Request) {
  return endpoint(async () => {
    const { revisionId, decision } = z
      .object({ revisionId: z.string().min(1).max(100), decision: z.unknown() })
      .strict()
      .parse(await jsonBody(request));
    return ok(
      await decideArt(await artSessionCookie(revisionId), revisionId, decision),
    );
  });
}
