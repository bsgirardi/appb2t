import { endpoint, jsonBody, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { requireActor } from "@/server/auth/guards";
import { artFileResponse } from "@/server/art/http";
import { deleteDraftFile } from "@/server/art/files";
import { artOperationSchema } from "@/domain/art/validation";
import { z } from "zod";
type Context = { params: Promise<{ id: string }> };
export function GET(request: Request, context: Context) {
  return endpoint(async () => {
    await requireActor();
    const file = await db.artFile.findUnique({
      where: { id: (await context.params).id },
    });
    if (!file) throw new AppError("NOT_FOUND", "Arquivo não encontrado.");
    return artFileResponse(
      file,
      new URL(request.url).searchParams.get("preview") === "1",
    );
  });
}
export function DELETE(request: Request, context: Context) {
  return endpoint(async () => {
    const actor = await requireActor();
    const v = z
      .object({
        expectedVersion: z.number().int().positive(),
        operationKey: artOperationSchema,
      })
      .strict()
      .parse(await jsonBody(request));
    return ok(
      await deleteDraftFile(
        actor,
        (await context.params).id,
        v.expectedVersion,
        v.operationKey,
      ),
    );
  });
}
