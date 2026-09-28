import { db } from "@/lib/db";
import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { createUser, userSelect } from "@/server/users";
export async function GET() {
  return endpoint(async () => {
    await requireAdmin();
    return ok(
      await db.user.findMany({ select: userSelect, orderBy: { name: "asc" } }),
    );
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    const a = await requireAdmin();
    return ok(await createUser(a, await jsonBody(request)));
  });
}
