import { db } from "@/lib/db";
import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { getArtRevision } from "@/server/art/queries";
import { createArtPackage } from "@/server/art/revisions";
type Context = { params: Promise<{ id: string }> };
export function GET(_request: Request, context: Context) {
  return endpoint(async () => {
    await requireActor();
    const { id } = await context.params;
    return ok(
      await db.$transaction(
        async (tx) => {
          const packages = await tx.artPackage.findMany({
            where: { requestId: id },
            include: { revisions: { orderBy: { number: "desc" } } },
            orderBy: { createdAt: "asc" },
          });
          return Promise.all(
            packages.map(async (p) => ({
              id: p.id,
              currentRevisionId: p.currentRevisionId,
              revisions: await Promise.all(
                p.revisions.map((r) => getArtRevision(tx, r.id)),
              ),
            })),
          );
        },
        { isolationLevel: "RepeatableRead" },
      ),
    );
  });
}
export function POST(request: Request, context: Context) {
  return endpoint(async () =>
    ok(
      await createArtPackage(
        await requireActor(),
        (await context.params).id,
        await jsonBody(request),
      ),
    ),
  );
}
