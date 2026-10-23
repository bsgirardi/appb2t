import { z } from "zod";
import { cookies } from "next/headers";
import { endpoint, jsonBody, ok } from "@/lib/http";
import { appUrl } from "@/lib/env";
import { exchangeArtToken } from "@/server/art/access";
import { artCookieName } from "@/server/art/cookies";
export function POST(request: Request) {
  return endpoint(async () => {
    const { token } = z
      .object({ token: z.string().max(100) })
      .strict()
      .parse(await jsonBody(request, { maxBytes: 1024 }));
    const result = await exchangeArtToken(token);
    (await cookies()).set(
      artCookieName(result.revisionId),
      result.sessionToken,
      {
        httpOnly: true,
        secure: appUrl().protocol === "https:",
        sameSite: "strict",
        path: "/api/portfolio/art",
        expires: result.expiresAt,
      },
    );
    return ok({ revisionId: result.revisionId });
  });
}
