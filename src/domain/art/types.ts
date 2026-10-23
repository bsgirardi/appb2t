export interface ArtManifestLine {
  sourceLineId: string;
  configurationHash: string;
}
export interface ArtManifestFile {
  id: string;
  purpose: "FINAL" | "REFERENCE";
  sha256: string;
  previewSha256: string | null;
}
export interface ArtManifest {
  schemaVersion: 1;
  instructions: string;
  lines: ArtManifestLine[];
  files: ArtManifestFile[];
}
export interface ArtRevisionDTO {
  id: string;
  packageId: string;
  number: number;
  state: string;
  version: number;
  instructions: string;
  manifestHash: string | null;
  lines: ArtManifestLine[];
  files: {
    id: string;
    name: string;
    purpose: string;
    mimeType: string;
    byteLength: number;
  }[];
  decision: {
    action: string;
    name: string;
    comment: string;
    decidedAt: string;
  } | null;
}
