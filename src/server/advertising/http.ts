import { jsonBody } from "@/lib/http";
export const adBody = (request: Request) =>
  jsonBody(request, { maxBytes: 32768 });
export type AdRouteContext = { params: Promise<{ id: string }> };
