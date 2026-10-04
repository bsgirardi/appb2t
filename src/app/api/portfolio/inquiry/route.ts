import { endpoint, jsonBody, ok } from "@/lib/http";
import { reviewInquiry } from "@/server/inquiry";
// Read-only, bounded public projection. Never creates a customer, quote or sale.
export async function POST(request: Request) {
  return endpoint(async () => ok(await reviewInquiry(await jsonBody(request))));
}
