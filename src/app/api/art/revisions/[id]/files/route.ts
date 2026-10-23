import { endpoint, ok } from "@/lib/http";
import { requireActor } from "@/server/auth/guards";
import { readArtUpload } from "@/server/art/http";
import { uploadArtFile } from "@/server/art/files";
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const actor = await requireActor();
    const v = await readArtUpload(request);
    return ok(
      await uploadArtFile(
        actor,
        (await context.params).id,
        v.expectedVersion,
        v.operationKey,
        v.file,
        v.purpose,
      ),
    );
  });
}
