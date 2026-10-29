import { db } from "@/lib/db";
import type { Actor } from "@/server/auth/session";
import { captureAdExport } from "./export-capture";
import { buildAdPackage } from "./export-package";
import { withAdExportSlot } from "./export-slots";
export async function exportAdDraft(
  actor: Actor,
  id: string,
  expectedVersion: number,
) {
  return withAdExportSlot(async () => {
    const capture = await captureAdExport(actor, id, expectedVersion);
    const bytes = await buildAdPackage(capture);
    await db.advertisingExport.create({
      data: {
        draftId: capture.draftId,
        draftVersion: capture.draftVersion,
        channel: capture.channel,
        createdById: actor.id,
      },
    });
    return {
      bytes,
      filename: `anuncio-${capture.draftId}-${capture.draftVersion}-${capture.channel.toLowerCase()}.zip`,
    };
  });
}
