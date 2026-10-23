import { db } from "@/lib/db";
import { endpoint, jsonBody, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import type { CatalogLineSnapshot } from "@/domain/catalog-requests/types";
import { moveArtLine } from "@/server/art/revisions";
type Context = { params: Promise<{ id: string }> };
export function GET(_request: Request, context: Context) {
  return endpoint(async () => {
    await requireActor();
    const { id: requestId } = await context.params;
    return ok(
      await db.$transaction(
        async (tx) => {
          const received = await tx.catalogRequestLine.findMany({
            where: { requestId },
          });
          const requirements = await tx.artLineRequirement.findMany({
            where: { requestId },
          });
          const lines = received
            .map((r) => r.snapshot as unknown as CatalogLineSnapshot)
            .map((line) => ({
              lineId: line.lineId,
              name: line.name,
              quantity: line.quantity,
              packageId:
                requirements.find((r) => r.sourceLineId === line.lineId)
                  ?.packageId ?? null,
            }));
          for (const r of requirements)
            if (!lines.some((l) => l.lineId === r.sourceLineId)) {
              const details = r.details as {
                description?: string;
                quantity?: number;
              } | null;
              lines.push({
                lineId: r.sourceLineId,
                name: details?.description ?? "Linha comercial",
                quantity: details?.quantity ?? 1,
                packageId: r.packageId,
              });
            }
          return lines;
        },
        { isolationLevel: "RepeatableRead" },
      ),
    );
  });
}
export function PATCH(request: Request, context: Context) {
  return endpoint(async () =>
    ok(
      await moveArtLine(
        await requireActor(),
        (await context.params).id,
        await jsonBody(request),
      ),
    ),
  );
}
