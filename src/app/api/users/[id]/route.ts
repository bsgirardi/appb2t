import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { updateUser } from "@/server/users";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const a = await requireAdmin();
    return ok(
      await updateUser(a, (await context.params).id, await jsonBody(request)),
    );
  });
}
