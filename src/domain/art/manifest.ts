import { createHash } from "node:crypto";
import { AppError } from "@/lib/errors";
import type { ArtManifest, ArtManifestFile, ArtManifestLine } from "./types";

export function buildArtManifest(input: {
  instructions: string;
  lines: ArtManifestLine[];
  files: ArtManifestFile[];
}): { manifest: ArtManifest; hash: string } {
  const files = input.files.filter((f) => f.purpose === "FINAL");
  if (
    !files.length ||
    !input.lines.length ||
    new Set(input.lines.map((l) => l.sourceLineId)).size !==
      input.lines.length ||
    new Set(input.files.map((f) => f.id)).size !== input.files.length
  )
    throw new AppError(
      "VALIDATION",
      "Confira as linhas e inclua pelo menos uma arte final sem duplicações.",
    );
  const manifest: ArtManifest = {
    schemaVersion: 1,
    instructions: input.instructions,
    lines: input.lines
      .map((l) => ({
        sourceLineId: l.sourceLineId,
        configurationHash: l.configurationHash,
        ...(l.description !== undefined ? { description: l.description } : {}),
        ...(l.quantity !== undefined ? { quantity: l.quantity } : {}),
      }))
      .sort((a, b) => a.sourceLineId.localeCompare(b.sourceLineId)),
    files: files
      .map((f) => ({
        id: f.id,
        purpose: f.purpose,
        sha256: f.sha256,
        previewSha256: f.previewSha256,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
  return {
    manifest,
    hash: createHash("sha256").update(JSON.stringify(manifest)).digest("hex"),
  };
}
