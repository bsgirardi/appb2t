import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import type { ArtManifestLine, ArtRevisionDTO } from "@/domain/art/types";

export async function getArtRevision(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<ArtRevisionDTO> {
  const row = await tx.artRevision.findUnique({
    where: { id },
    include: {
      files: {
        select: {
          id: true,
          name: true,
          purpose: true,
          mimeType: true,
          byteLength: true,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
      decision: true,
    },
  });
  if (!row) throw new AppError("NOT_FOUND", "Revisão de arte não encontrada.");
  return {
    id: row.id,
    packageId: row.packageId,
    number: row.number,
    state: row.state,
    version: row.version,
    instructions: row.instructions,
    manifestHash: row.manifestHash,
    lines: row.lines as unknown as ArtManifestLine[],
    files: row.files,
    decision: row.decision
      ? {
          action: row.decision.action,
          name: row.decision.name,
          comment: row.decision.comment,
          decidedAt: row.decision.decidedAt.toISOString(),
        }
      : null,
  };
}
