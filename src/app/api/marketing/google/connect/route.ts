import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import {
  startGoogleConnection,
  disconnectGoogle,
} from "@/server/google/connection";
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    await jsonBody(request);
    return ok({ url: await startGoogleConnection(actor.id) });
  });
}
export async function DELETE(request: Request) {
  return endpoint(async () => {
    await requireAdmin();
    await jsonBody(request);
    await disconnectGoogle();
    return ok({ disconnected: true });
  });
}
