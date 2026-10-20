import { z } from "zod";
import { endpoint, jsonBody, ok } from "@/lib/http";
import { attemptKeySchema } from "@/domain/catalog-requests/validation";
import { findCatalogReceipt } from "@/server/catalog-requests/receive";
export async function POST(request: Request) {
  return endpoint(async () => {
    const { attemptKey } = z
      .object({ attemptKey: attemptKeySchema })
      .strict()
      .parse(await jsonBody(request));
    return ok(await findCatalogReceipt(attemptKey));
  });
}
