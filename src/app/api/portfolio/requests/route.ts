import { endpoint, jsonBody, ok } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { requestBrowserId } from "@/server/catalog-requests/browser";
import { receiveCatalogRequest } from "@/server/catalog-requests/receive";
export async function POST(request: Request) {
  return endpoint(async () => {
    const raw = await jsonBody(request, { maxBytes: 262144 });
    const browserId = await requestBrowserId(request);
    if (!browserId)
      throw new AppError(
        "FORBIDDEN",
        "Atualize a página para iniciar o envio.",
      );
    return ok(await receiveCatalogRequest(raw, browserId));
  });
}
