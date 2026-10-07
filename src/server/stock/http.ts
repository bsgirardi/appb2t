import { endpoint, jsonBody } from "@/lib/http";
import { AppError } from "@/lib/errors";
export async function stockBody(request: Request) {
  try {
    return await jsonBody(request, { maxBytes: 256 * 1024 });
  } catch (e) {
    if (e instanceof AppError && e.message === "Requisição muito grande.")
      throw new RangeError(e.message);
    throw e;
  }
}
export async function stockEndpoint(
  fn: () => Promise<Response>,
  query = false,
) {
  let tooLarge = false;
  const response = await endpoint(async () => {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof RangeError) {
        tooLarge = true;
        throw new AppError("VALIDATION", e.message);
      }
      throw e;
    }
  });
  if (tooLarge || (query && response.status === 422))
    return new Response(response.body, {
      headers: response.headers,
      status: tooLarge ? 413 : 400,
    });
  return response;
}
