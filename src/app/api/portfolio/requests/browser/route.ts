import { z } from "zod";
import { endpoint, jsonBody, ok } from "@/lib/http";
import { appUrl } from "@/lib/env";
import {
  initializeRequestBrowser,
  REQUEST_BROWSER_COOKIE,
} from "@/server/catalog-requests/browser";
export async function POST(request: Request) {
  return endpoint(async () => {
    z.object({})
      .strict()
      .parse(await jsonBody(request));
    const token = await initializeRequestBrowser(request);
    const response = ok({ ready: true });
    if (token)
      response.cookies.set(REQUEST_BROWSER_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: appUrl().protocol === "https:",
        path: "/api/portfolio/requests",
        maxAge: 86400,
      });
    return response;
  });
}
